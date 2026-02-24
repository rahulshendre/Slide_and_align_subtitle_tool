
// Polyfill for String.trim() for ExtendScript compatibility
if (!String.prototype.trim) {
    String.prototype.trim = function() {
        return this.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, "");
    };
}

$.runScript = {

    // Helper function to get video duration from active sequence
    getVideoDuration: function() {
        var activeSeq = app.project.activeSequence;
        if (!activeSeq) {
            return null;
        }

        // Try several methods, in order of most common to least
        var duration = 0;

        // Method 1: Try to get from sequence end
        try {
            if (activeSeq.end && typeof activeSeq.end.seconds === 'number') {
                duration = activeSeq.end.seconds;
                if (duration > 0) return duration;
            }
        } catch (e) {}

        // Method 2: Try to get from sequence duration property
        try {
            if (activeSeq.duration && typeof activeSeq.duration.seconds === 'number') {
                duration = activeSeq.duration.seconds;
                if (duration > 0) return duration;
            }
        } catch (e) {}

        // Method 3: Calculate from video tracks
        try {
            var totalDuration = 0;
            if (activeSeq.videoTracks && typeof activeSeq.videoTracks.numTracks === 'number') {
                for (var i = 0; i < activeSeq.videoTracks.numTracks; i++) {
                    var track = activeSeq.videoTracks[i];
                    if (track && track.clips && typeof track.clips.numItems === 'number') {
                        for (var j = 0; j < track.clips.numItems; j++) {
                            var clip = track.clips[j];
                            if (clip && clip.end && typeof clip.end.seconds === 'number') {
                                var clipEnd = clip.end.seconds;
                                if (clipEnd > totalDuration) {
                                    totalDuration = clipEnd;
                                }
                            }
                        }
                    }
                }
            }
            if (totalDuration > 0) return totalDuration;
        } catch (e) {}

        // Method 4: Try to get from sequence bounds (rare)
        try {
            if (activeSeq.getPlayerBounds && typeof activeSeq.getPlayerBounds === 'function') {
                var bounds = activeSeq.getPlayerBounds();
                if (bounds && bounds.width && typeof bounds.width.seconds === 'number') {
                    duration = bounds.width.seconds;
                    if (duration > 0) return duration;
                }
            }
        } catch (e) {}

        // If all methods fail, return a default duration
        return 60; // Default to 60 seconds if we can't determine duration
    },

    // Helper to apply decimal word spacing (integer spaces + scaled thin spaces for fraction)
    applyWordSpacing: function(line, spacing) {
        var intSpaces = Math.floor(spacing);
        var extra = spacing - intSpaces;
        var spaceStr = Array(intSpaces + 1).join(' ');
        // Scale fractional part: ~5 thin spaces (U+2009) ≈ 1 normal space
        var thinCount = extra > 0 ? Math.max(1, Math.round(extra * 5)) : 0;
        var thinSpace = thinCount > 0 ? Array(thinCount + 1).join(String.fromCharCode(0x2009)) : '';
        return line.replace(/ +/g, spaceStr + thinSpace);
    },

    // Helper to convert seconds to SRT time format
    toSRTTime: function(timeInSeconds) {
        var totalMilliseconds = Math.round(timeInSeconds * 1000);
        var milliseconds = totalMilliseconds % 1000;
        var totalSeconds = Math.floor(totalMilliseconds / 1000);
        var seconds = totalSeconds % 60;
        var totalMinutes = Math.floor(totalSeconds / 60);
        var minutes = totalMinutes % 60;
        var hours = Math.floor(totalMinutes / 60);
        function pad(num, size) {
            var s = "000" + num;
            return s.substr(s.length - size);
        }
        return pad(hours, 2) + ":" + pad(minutes, 2) + ":" + pad(seconds, 2) + "," + pad(milliseconds, 3);
    },

    // Helper to parse time string to seconds
    parseTimeToSeconds: function(timeStr) {
        if (!timeStr || timeStr === "") return null;
        timeStr = timeStr.replace(/^\s+|\s+$/g, "");
        var regex = /^(\d{1,2}):(\d{1,2}):(\d{1,2})(?:[\.,](\d{1,3}))?$/;
        var match = timeStr.match(regex);
        if (!match) return null;
        var h = parseInt(match[1], 10), m = parseInt(match[2], 10), s = parseInt(match[3], 10), ms = match[4] ? parseInt(match[4], 10) : 0;
        if (h < 0 || m < 0 || m >= 60 || s < 0 || s >= 60) return null;
        var total = h * 3600 + m * 60 + s + (ms / 1000);
        return isNaN(total) || total < 0 ? null : total;
    },

    // Helper to format seconds as HH:MM:SS (no milliseconds)
    toHHMMSS: function(timeInSeconds) {
        var totalSeconds = Math.max(0, Math.floor(timeInSeconds));
        var seconds = totalSeconds % 60;
        var totalMinutes = Math.floor(totalSeconds / 60);
        var minutes = totalMinutes % 60;
        var hours = Math.floor(totalMinutes / 60);
        function pad(num, size) {
            var s = "000" + num;
            return s.substr(s.length - size);
        }
        return pad(hours, 2) + ":" + pad(minutes, 2) + ":" + pad(seconds, 2);
    },

    // Get current playhead position as HH:MM:SS for auto time pickup (manual mode)
    getPlayheadTimeFormatted: function() {
        try {
            var seq = app.project.activeSequence;
            if (!seq) return "ERROR: No active sequence.";
            var pos = seq.getPlayerPosition();
            if (!pos || typeof pos.seconds !== 'number') return "ERROR: Could not get playhead position.";
            return this.toHHMMSS(pos.seconds);
        } catch (e) {
            return "ERROR: " + (e.message || "Could not get playhead time.");
        }
    },

    // Main subtitle creation function
    createSubtitlesFromFile: function(filePath, wordSpacing, totalDuration, startTimeOffset) {
        // Utility: get correct file path separator
        function getSep() {
            if (Folder.fs === 'Macintosh') {
                return '/';
            } else {
                return '\\';
            }
        }

        // Utility: post messages to the Premiere Pro Events panel
        function updateEventPanel(message) {
            app.setSDKEventMessage(message, 'info');
        }

        // Polyfill for String.trim() since ExtendScript does not support it
        function trim(str) {
            return str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, "");
        }

        // CROSS-PLATFORM PATH NORMALIZATION:
        // ExtendScript File constructor accepts forward slashes on both Windows and Mac
        // This ensures the file path works correctly regardless of the platform
        // Paths are normalized in main.js, but we normalize again here for safety
        var normalizedFilePath = filePath;
        if (normalizedFilePath) {
            // Convert backslashes to forward slashes (works on both platforms in ExtendScript)
            normalizedFilePath = normalizedFilePath.replace(/\\/g, "/");
            // Remove any file:// protocol prefix if present (from CEP file input)
            normalizedFilePath = normalizedFilePath.replace(/^file:\/\/\/?/i, "");
            // Handle Windows absolute paths: ensure C:/ format (not /C:/)
            if (normalizedFilePath.match(/^\/[A-Z]:/i)) {
                normalizedFilePath = normalizedFilePath.substring(1);
            }
        }
        
        // Read the script file robustly for all languages
        var scriptFile = new File(normalizedFilePath);
        var script = "";
        
        // Verify file exists and path is valid
        if (!scriptFile) {
            updateEventPanel("Invalid file path provided.");
            return "Invalid file path provided.";
        }
        
        if (scriptFile && scriptFile.exists) {
            // Try UTF-16 first (best for all languages)
            scriptFile.encoding = "UTF-16";
            if (scriptFile.open("r")) {
                script = scriptFile.read();
                scriptFile.close();
            }
            // Fallback: Try UTF-8 if UTF-16 fails
            if (!script) {
                scriptFile.encoding = "UTF-8";
                if (scriptFile.open("r")) {
                    script = scriptFile.read();
                    scriptFile.close();
                }
            }
            if (!script) {
                updateEventPanel("Could not read the selected script file. Please save as UTF-16 LE if using non-English text.");
                return "Could not read the selected script file. Please save as UTF-16 LE if using non-English text.";
            }
        } else {
            updateEventPanel("No script file selected or file does not exist.");
            return "No script file selected or file does not exist.";
        }

        if (!script) {
            updateEventPanel("Script file is empty.");
            return "Script file is empty.";
        }

        // Normalize all line endings to \n
        var normalizedScript = script.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        var lines = normalizedScript.split('\n');

        // Filter out empty/whitespace-only lines
        var validLines = [];
        for (var i = 0; i < lines.length; i++) {
            var trimmed = trim(lines[i]);
            if (trimmed.length > 0) {
                validLines.push(trimmed);
            }
        }

        if (validLines.length === 0) {
            updateEventPanel("No valid subtitle lines found in the script.");
            return "No valid subtitle lines found in the script.";
        }

        // Default to 1 if not provided or invalid, and limit to 15
        if (!wordSpacing || wordSpacing < 1) wordSpacing = 1;
        if (wordSpacing > 15) wordSpacing = 15;

        // Count words in each line and total words
        var wordCounts = [];
        var totalWords = 0;
        for (var i = 0; i < validLines.length; i++) {
            // Manual word count for compatibility
            var words = validLines[i].replace(/(^\s+|\s+$)/g, '').split(/\s+/);
            var count = 0;
            for (var w = 0; w < words.length; w++) {
                if (words[w].length > 0) count++;
            }
            wordCounts.push(count);
            totalWords += count;
        }

        if (totalWords === 0) {
            updateEventPanel("No words found in the script.");
            return "No words found in the script.";
        }

        // Calculate durations for each line
        var durations = [];
        for (var i = 0; i < wordCounts.length; i++) {
            durations.push((wordCounts[i] / totalWords) * totalDuration);
        }

        // Now build the SRT with proportional durations
        var srtContent = "";
        var startTime = (typeof startTimeOffset === 'number' && !isNaN(startTimeOffset)) ? startTimeOffset : 0;
        var captionIndex = 1;
        for (var i = 0; i < validLines.length; i++) {
            var line = validLines[i];
            var duration = durations[i];
            var endTime = startTime + duration;
            var spacedLine = this.applyWordSpacing(line, wordSpacing);
            srtContent += captionIndex + "\n";
            srtContent += this.toSRTTime(startTime) + " --> " + this.toSRTTime(endTime) + "\n";
            srtContent += spacedLine + "\n\n";
            startTime = endTime;
            captionIndex++;
        }

        if (srtContent === "") {
            updateEventPanel("No valid lines found in the script.");
            return "No valid lines found in the script.";
        }

        // Use a unique filename for each SRT export to avoid caching issues
        var uniqueName = "temp_subtitles_" + (new Date().getTime()) + ".srt";
        // KEY FIX: Use Folder.temp instead of Desktop to avoid permission errors
        // Folder.temp.fsName resolves to system temp directory:
        // - macOS: /var/folders/.../TemporaryItems/ or ~/Library/Caches/...
        // - Windows: C:\Users\...\AppData\Local\Temp\
        var tempFile = new File(Folder.temp.fsName + getSep() + uniqueName);
        
        // Helper function to write SRT file with proper encoding
        function writeSrtToFile(targetFile, content, useWindowsEOL, addUtf8BOM) {
            var finalText = content;
            
            // Normalize line endings
            if (useWindowsEOL) {
                // Windows format: CRLF (\r\n)
                finalText = finalText.replace(/\r?\n/g, "\r\n");
            } else {
                // Unix format: LF (\n)
                finalText = finalText.replace(/\r?\n/g, "\n");
            }
            
            // Add UTF-8 BOM if needed (some Premiere builds prefer this)
            if (addUtf8BOM) {
                // Prepend Byte Order Mark (U+FEFF)
                finalText = "\uFEFF" + finalText;
            }
            
            // Set file encoding to UTF-8
            targetFile.encoding = "UTF8";
            targetFile.lineFeed = useWindowsEOL ? "Windows" : "Unix";
            
            // Open file for writing
            if (!targetFile.open("w")) {
                return false; // Failed to open file
            }
            
            // Write content and close
            targetFile.write(finalText);
            targetFile.close();
            return true;
        }
        
        // Attempt 1: UTF-8 (no BOM), Unix line endings (LF)
        var wrote = writeSrtToFile(tempFile, srtContent, false, false);
        if (!wrote) {
            updateEventPanel("Failed to open temp SRT file for writing.");
            return "Failed to open temp SRT file for writing.";
        }

        var activeSeq = app.project.activeSequence;
        if (!activeSeq) {
            updateEventPanel("No active sequence. Cannot add captions.");
            return "No active sequence. Cannot add captions.";
        }

        var destBin = app.project.getInsertionBin ? app.project.getInsertionBin() : app.project.rootItem;
        if (!destBin) {
            updateEventPanel("No valid destination bin found for import.");
            return "No valid destination bin found for import.";
        }
        
        // Count items before import to verify success
        var prevItemCount = destBin && destBin.children ? destBin.children.numItems : 0;
        
        // Import the temp file using its filesystem path
        // CRITICAL: Use .fsName to get full path
        var importThese = [tempFile.fsName];
        var importOk = app.project.importFiles(importThese, true, destBin, false);
        
        // Verify import by checking if bin count increased
        var newItemCount = destBin && destBin.children ? destBin.children.numItems : 0;
        
        // If first attempt didn't increase items, retry with CRLF + BOM
        if (newItemCount <= prevItemCount) {
            updateEventPanel("Import attempt 1 did not increase bin count. Retrying with CRLF + UTF-8 BOM...");
            
            // Overwrite file with Windows format (CRLF + BOM)
            writeSrtToFile(tempFile, srtContent, true, true);
            
            prevItemCount = destBin.children.numItems;
            importOk = app.project.importFiles([tempFile.fsName], true, destBin, false);
            
            newItemCount = destBin.children.numItems;
            if (newItemCount <= prevItemCount) {
                updateEventPanel("SRT import failed. Please check that your Premiere build supports SRT import; a CRLF + UTF-8 BOM variant also failed. File: " + tempFile.fsName);
                return "SRT import failed. File: " + tempFile.fsName;
            }
        }
        
        // Get the imported SRT file from the bin
        var importedSRT = destBin.children[newItemCount - 1];
        if (!importedSRT) {
            updateEventPanel("Imported SRT not found in bin after import.");
            return "Imported SRT not found in bin after import.";
        }
        
        // Create caption track from the imported SRT file
        var startAtTime = 0;
        var result = activeSeq.createCaptionTrack(importedSRT, startAtTime);
        if (result) {
            updateEventPanel("Subtitles successfully inserted in the captions tracks from the script.");
            return "Subtitles successfully inserted in the captions tracks from the script.";
        } else {
            updateEventPanel("Failed to create caption track from imported SRT.");
            return "Failed to create caption track from imported SRT.";
        }
    },

    // Subtitle workflow function (Feature 1)
    runSubtitleWorkflow: function(timingMode, scriptPath, wordSpacing, startTimeStr, endTimeStr) {
        var seq = app.project.activeSequence;
        if (!seq) {
            return "No active sequence.";
        }

        if (!scriptPath) {
            return "Script file not provided.";
        }

        if (isNaN(wordSpacing) || wordSpacing < 0) wordSpacing = 0;
        if (wordSpacing > 15) wordSpacing = 15;

        var totalDuration = 0;
        var startTime = 0;

        if (timingMode === 'manual') {
            var startTimeVal = this.parseTimeToSeconds(startTimeStr);
            var endTimeVal = this.parseTimeToSeconds(endTimeStr);
            if (startTimeVal === null || endTimeVal === null) {
                return "Invalid start or end time format. Please use HH:MM:SS.";
            }
            if (endTimeVal <= startTimeVal) {
                return "End time must be after start time.";
            }
            totalDuration = endTimeVal - startTimeVal;
            startTime = startTimeVal;
        } else {
            // Automated timing
            totalDuration = this.getVideoDuration();
            if (!totalDuration || totalDuration <= 0) {
                return "Could not determine video duration. Please make sure your sequence has content.";
            }
            startTime = 0;
        }

        return this.createSubtitlesFromFile(scriptPath, wordSpacing, totalDuration, startTime);
    }

};
