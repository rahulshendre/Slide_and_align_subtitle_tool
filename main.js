// Initialize CSInterface with proper error handling
var csInterface = null;

try {
    if (typeof CSInterface !== 'undefined') {
        csInterface = new CSInterface();
        console.log("CSInterface initialized successfully");
    } else {
        console.log("CSInterface not available - running in test mode");
    }
} catch (error) {
    console.log("Error initializing CSInterface: " + error);
    console.log("Running in test mode without Adobe integration");
}

// Helper function to safely call evalScript
function safeEvalScript(script, callback) {
    if (csInterface && typeof csInterface.evalScript === 'function') {
        try {
            csInterface.evalScript(script, callback);
        } catch (error) {
            console.log("ERROR calling evalScript: " + error);
            if (callback) callback(null);
        }
    } else {
        console.log("CSInterface not available or evalScript not a function");
        if (callback) callback(null);
    }
}

// Custom file input logic for subtitleScriptFile
var subtitleScriptFileInput = document.getElementById('subtitleScriptFile');
var customSubtitleFileButton = document.getElementById('customSubtitleFileButton');
var customSubtitleFileName = document.getElementById('customSubtitleFileName');

if (customSubtitleFileButton) {
    customSubtitleFileButton.onclick = function() {
        subtitleScriptFileInput.click();
    };
}

if (subtitleScriptFileInput) {
    subtitleScriptFileInput.onchange = function() {
        if (subtitleScriptFileInput.files && subtitleScriptFileInput.files.length > 0) {
            customSubtitleFileName.textContent = subtitleScriptFileInput.files[0].name;
        } else {
            customSubtitleFileName.textContent = 'No file chosen';
        }
    };
}

// Word spacing slider and number input sync
var wordSpacingSlider = document.getElementById('wordSpacingSlider');
var wordSpacingInput = document.getElementById('wordSpacing');

if (wordSpacingSlider && wordSpacingInput) {
    wordSpacingSlider.oninput = function() {
        wordSpacingInput.value = wordSpacingSlider.value;
    };
    
    wordSpacingInput.oninput = function() {
        wordSpacingSlider.value = wordSpacingInput.value;
    };
}

// Custom arrow button functionality for word spacing
var wordSpacingUp = document.getElementById('wordSpacingUp');
var wordSpacingDown = document.getElementById('wordSpacingDown');

if (wordSpacingUp) {
    wordSpacingUp.onclick = function() {
        var currentValue = parseFloat(wordSpacingInput.value);
        var step = parseFloat(wordSpacingInput.step);
        var max = parseFloat(wordSpacingInput.max);
        var newValue = Math.min(currentValue + step, max);
        wordSpacingInput.value = newValue.toFixed(1);
        wordSpacingSlider.value = newValue;
    };
}

if (wordSpacingDown) {
    wordSpacingDown.onclick = function() {
        var currentValue = parseFloat(wordSpacingInput.value);
        var step = parseFloat(wordSpacingInput.step);
        var min = parseFloat(wordSpacingInput.min);
        var newValue = Math.max(currentValue - step, min);
        wordSpacingInput.value = newValue.toFixed(1);
        wordSpacingSlider.value = newValue;
    };
}

// Timing mode handling
function updateTimingMode() {
    var timingMode = document.querySelector('.timing-btn.active');
    if (!timingMode) return;
    
    timingMode = timingMode.dataset.timing;
    var manualTimingGroup = document.getElementById('manualTimingGroup');
    var endTimeGroup = document.getElementById('endTimeGroup');
    
    if (timingMode === 'manual') {
        if (manualTimingGroup) manualTimingGroup.style.display = 'block';
        if (endTimeGroup) endTimeGroup.style.display = 'block';
    } else {
        if (manualTimingGroup) manualTimingGroup.style.display = 'none';
        if (endTimeGroup) endTimeGroup.style.display = 'none';
    }
}

// Add event listeners for timing mode buttons
document.addEventListener('DOMContentLoaded', function() {
    var timingBtns = document.querySelectorAll('.timing-btn');
    timingBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            // Remove active class from all buttons
            timingBtns.forEach(function(b) { b.classList.remove('active'); });
            // Add active class to clicked button
            this.classList.add('active');
            // Update the timing mode display
            updateTimingMode();
        });
    });
    
    // Initialize timing mode display
    updateTimingMode();
});

// Run button logic - Feature 1 only
var runButton = document.getElementById('runButton');
if (runButton) {
    runButton.addEventListener('click', function() {
        var timingMode = document.querySelector('.timing-btn.active');
        if (!timingMode) {
            var resultDiv = document.getElementById('result');
            if (resultDiv) {
                resultDiv.textContent = 'Please select a timing mode.';
                resultDiv.className = 'error';
            }
            return;
        }
        
        timingMode = timingMode.dataset.timing;
        var startTimeStr = '';
        var endTimeStr = '';
        
        if (timingMode === 'manual') {
            var startTimeInput = document.getElementById('startTime');
            var endTimeInput = document.getElementById('endTime');
            if (startTimeInput) startTimeStr = startTimeInput.value;
            if (endTimeInput) endTimeStr = endTimeInput.value;
        }

        var subtitleScriptFile = document.getElementById('subtitleScriptFile');
        var wordSpacingInput = document.getElementById('wordSpacing');
        var wordSpacing = wordSpacingInput ? parseFloat(wordSpacingInput.value) : 1.0;
        
        var scriptPath = '';
        if (subtitleScriptFile && subtitleScriptFile.files && subtitleScriptFile.files[0]) {
            // CEP file input provides path property (cross-platform compatible)
            // On Windows: path may contain backslashes (C:\Users\...)
            // On Mac: path uses forward slashes (/Users/...)
            var file = subtitleScriptFile.files[0];
            scriptPath = file.path || file.name;
            if (scriptPath) {
                // CROSS-PLATFORM PATH NORMALIZATION:
                // ExtendScript File constructor accepts forward slashes on both Windows and Mac
                // So we normalize all paths to use forward slashes for consistency
                scriptPath = scriptPath.replace(/\\/g, "/");
                // Remove any file:// protocol prefix if present (CEP may add this)
                scriptPath = scriptPath.replace(/^file:\/\/\/?/i, "");
                // Handle Windows absolute paths: ensure C:/ format (not /C:/)
                if (scriptPath.match(/^[A-Z]:\//i)) {
                    // Keep as is - C:/path is valid on Windows in ExtendScript
                } else if (scriptPath.startsWith("/") && scriptPath.match(/^\/[A-Z]:/i)) {
                    // Remove leading slash from /C:/path to get C:/path
                    scriptPath = scriptPath.substring(1);
                }
            }
        }
        
        if (!scriptPath) {
            var resultDiv = document.getElementById('result');
            if (resultDiv) {
                resultDiv.textContent = 'Please select a subtitle script file.';
                resultDiv.className = 'error';
            }
            return;
        }
        
        // Escape the path properly for JavaScript string
        // Normalize to forward slashes (works on both Windows and Mac in ExtendScript)
        // Escape special characters that could break JavaScript string
        var escapedPath = scriptPath
            .replace(/\\/g, '/')           // Normalize backslashes to forward slashes
            .replace(/"/g, '\\"')          // Escape double quotes
            .replace(/'/g, "\\'")           // Escape single quotes
            .replace(/\n/g, '\\n')          // Escape newlines
            .replace(/\r/g, '\\r')           // Escape carriage returns
            .replace(/\t/g, '\\t');          // Escape tabs
        var escapedStartTime = startTimeStr
            .replace(/"/g, '\\"')
            .replace(/'/g, "\\'")
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t');
        var escapedEndTime = endTimeStr
            .replace(/"/g, '\\"')
            .replace(/'/g, "\\'")
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t');
        
        var jsxCall = '$.runScript.runSubtitleWorkflow(' +
            '"' + timingMode + '", ' +
            '"' + escapedPath + '", ' +
            wordSpacing + ', ' +
            '"' + escapedStartTime + '", ' +
            '"' + escapedEndTime + '")';
        
        var resultDiv = document.getElementById('result');
        if (resultDiv) {
            resultDiv.className = '';
        }
        
        // Use csInterface if available, otherwise try to create new one
        if (!csInterface && typeof CSInterface !== 'undefined') {
            try {
                csInterface = new CSInterface();
            } catch (e) {
                console.log("Could not create CSInterface: " + e);
            }
        }
        
        if (!csInterface) {
            if (resultDiv) {
                resultDiv.textContent = 'Error: CSInterface not available.';
                resultDiv.className = 'error';
            }
            return;
        }
        
        safeEvalScript(jsxCall, function(result) {
            if (resultDiv) {
                resultDiv.textContent = result || 'Operation completed.';
                resultDiv.className = result && result.toLowerCase().indexOf('error') !== -1 ? 'error' : 'success';
            }
        });
    });
}

// Time input validation and formatting
function formatTimeInput(input) {
    var value = input.value.replace(/\D/g, '');
    if (value.length >= 6) {
        value = value.substring(0, 6);
    }
    if (value.length >= 4) {
        value = value.substring(0, 2) + ':' + value.substring(2, 4) + ':' + value.substring(4);
    } else if (value.length >= 2) {
        value = value.substring(0, 2) + ':' + value.substring(2);
    }
    input.value = value;
}

function validateTimeInput(input) {
    var value = input.value;
    var timeRegex = /^([0-9]|0[0-9]|1[0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])$/;
    
    if (value && !timeRegex.test(value)) {
        input.style.borderColor = '#ff5c5c';
    } else {
        input.style.borderColor = '#2d3748';
    }
}

// Add event listeners for time inputs
document.addEventListener('DOMContentLoaded', function() {
    var startTimeInput = document.getElementById('startTime');
    var endTimeInput = document.getElementById('endTime');
    
    if (startTimeInput) {
        startTimeInput.addEventListener('input', function() {
            formatTimeInput(this);
            validateTimeInput(this);
        });
        startTimeInput.addEventListener('blur', function() {
            validateTimeInput(this);
        });
    }
    
    if (endTimeInput) {
        endTimeInput.addEventListener('input', function() {
            formatTimeInput(this);
            validateTimeInput(this);
        });
        endTimeInput.addEventListener('blur', function() {
            validateTimeInput(this);
        });
    }

    // Auto time pickup from playhead (manual mode)
    var pickupStartBtn = document.getElementById('pickupStartTime');
    var pickupEndBtn = document.getElementById('pickupEndTime');
    var resultDiv = document.getElementById('result');

    function setTimeFromPlayhead(inputEl, resultEl) {
        if (!inputEl) return;
        if (!csInterface || typeof csInterface.evalScript !== 'function') {
            if (resultEl) {
                resultEl.textContent = 'Premiere Pro connection not available.';
                resultEl.className = 'error';
            }
            return;
        }
        csInterface.evalScript('$.runScript.getPlayheadTimeFormatted()', function(result) {
            if (result && result.indexOf('ERROR:') === 0) {
                if (resultEl) {
                    resultEl.textContent = result.replace(/^ERROR:\s*/, '');
                    resultEl.className = 'error';
                }
            } else if (result && /^\d{1,2}:\d{2}:\d{2}$/.test(result)) {
                inputEl.value = result;
                validateTimeInput(inputEl);
                if (resultEl) {
                    resultEl.textContent = 'Time set from playhead.';
                    resultEl.className = 'success';
                }
            }
        });
    }

    if (pickupStartBtn) {
        pickupStartBtn.addEventListener('click', function() {
            setTimeFromPlayhead(startTimeInput, resultDiv);
        });
    }
    if (pickupEndBtn) {
        pickupEndBtn.addEventListener('click', function() {
            setTimeFromPlayhead(endTimeInput, resultDiv);
        });
    }
});

// Global error handler
window.addEventListener('error', function(event) {
    console.log("Global error caught:", event.error);
    console.log("Error message:", event.message);
    console.log("Error filename:", event.filename);
    console.log("Error line number:", event.lineno);
});

