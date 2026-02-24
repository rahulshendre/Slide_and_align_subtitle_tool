# Slide and Align Subtitle Tool

A Premiere Pro extension for creating and aligning static subtitles with automated or manual timing distribution.

## Overview

This extension simplifies the process of adding subtitles to your Premiere Pro projects. Load your subtitle text file, choose between automated or manual timing modes, adjust word spacing, and automatically generate caption tracks with proportional timing distribution.

## Features

- **Load Text Files**: Support for `.txt` file format with UTF-16 and UTF-8 encoding
- **Automated Timing Mode**: Automatically distributes subtitles proportionally based on video duration and word count
- **Manual Timing Mode**: Set custom start and end times for precise subtitle placement
- **Proportional Timing**: Word-count-based duration distribution for natural pacing
- **Word Spacing Control**: Adjustable word spacing (0-15) for visual customization
- **Auto-Caption Track Creation**: Automatically creates caption tracks in Premiere Pro
- **Dynamic Duration**: Longer subtitle lines automatically receive more screen time

## File Structure

```
SlideAndAlignSubtitleTool/
├── CSInterface.js          # Adobe CEP interface library
├── CSXS/
│   └── manifest.xml         # Extension manifest (configures the extension)
├── jsx/
│   └── extendScript.jsx     # Main ExtendScript logic for subtitle processing
├── index.html               # UI HTML interface
├── main.js                  # JavaScript logic and event handlers
├── style.css                # Styling and UI design
├── bird_logo.png            # Brand logo (left)
├── planetread_logo.png      # Brand logo (right)
└── README.md                # This file
```

## Requirements

- **Adobe Premiere Pro**: Version 25.0 to 25.9
- **CEP Runtime**: Version 12.0 or higher
- **Operating System**: Windows or macOS

## Installation

### Step 1: Locate Extensions Directory

- **Windows**: `C:\Program Files (x86)\Common Files\Adobe\CEP\extensions\`
- **macOS**: `~/Library/Application Support/Adobe/CEP/extensions/`

### Step 2: Copy Extension Folder

Copy the entire `V1` folder (or rename it to `SlideAndAlignSubtitleTool`) to the extensions directory.

### Step 3: Enable Unsigned Extensions (Development Only)

For development/testing purposes, you may need to enable unsigned extensions:

**Windows:**
1. Create or edit the registry key: `HKEY_CURRENT_USER\Software\Adobe\CSXS.12`
2. Add a String value: `PlayerDebugMode` = `1`

**macOS:**
1. Open Terminal
2. Run: `defaults write com.adobe.CSXS.12 PlayerDebugMode 1`

### Step 4: Restart Premiere Pro

Close and restart Adobe Premiere Pro to load the extension.

### Step 5: Access the Extension

Go to **Window > Extensions > Slide and Align Subtitle Tool**

## Usage

### Basic Workflow

1. **Load Your Subtitle File**
   - Click "Choose File" button
   - Select a `.txt` file containing your subtitle text
   - One subtitle per line

2. **Choose Timing Mode**
   - **Automated Timing**: Subtitles are distributed proportionally across the entire video duration based on word count
   - **Manual Timing**: Enter start and end times in HH:MM:SS format for precise control

3. **Adjust Word Spacing (Optional)**
   - Use the slider or arrow buttons to adjust word spacing
   - Range: 0 to 15 (1.0 = normal spacing)
   - Affects visual word separation in the captions

4. **Create Subtitles**
   - Click "Create Subtitles" button
   - The extension will:
     - Calculate proportional durations for each subtitle line
     - Generate an SRT file with timing information
     - Import the SRT into Premiere Pro
     - Create a caption track automatically

### Timing Modes Explained

**Automated Timing:**
- Automatically detects video duration from the active sequence
- Distributes subtitles proportionally based on word count
- Longer lines get more screen time automatically
- Best for: Quick subtitle placement with natural pacing

**Manual Timing:**
- Enter start time (e.g., 00:00:00)
- Enter end time (e.g., 00:05:00)
- Subtitles are distributed proportionally within this time window
- Best for: Precise control over subtitle timing window

### File Format Support

**Text Files (.txt):**
- One subtitle per line
- Supports UTF-8 and UTF-16 encoding (UTF-16 LE recommended)
- Empty lines are automatically filtered out
- Word count determines proportional duration

**How to Save as UTF-16 LE:**
1. Open your text file in Notepad
2. Go to File → Save As
3. In the Encoding dropdown, select "Unicode (UTF-16 LE)"
4. Click Save

### Proportional Timing Algorithm

The extension uses a sophisticated word-count-based algorithm:
- Counts words in each subtitle line
- Calculates total words across all lines
- Distributes available time proportionally
- Longer lines automatically receive more duration
- Creates natural, readable subtitle pacing

### Tips

- **For best results**: Use UTF-16 LE encoding for text files
- **Word spacing**: Adjust to match your visual design preferences
- **Automated timing**: Works best with complete video sequences
- **Manual timing**: Use when you need subtitles in a specific time window
- The extension uses temporary files to avoid permission issues

## Technical Details

### Extension Configuration

- **Bundle ID**: `com.subtitle.tool`
- **Version**: 1.0.0
- **Panel Size**: 400x800 pixels
- **Auto-Visible**: Yes

### Temporary Files

SRT files for caption import are created in the system temporary folder (`Folder.temp`) to avoid file permission issues. Files are automatically cleaned up after import.

### ExtendScript Functions

The main ExtendScript functions available in `extendScript.jsx`:

- `runSubtitleWorkflow(timingMode, scriptPath, wordSpacing, startTimeStr, endTimeStr)` - Main workflow function
- `createSubtitlesFromFile(filePath, wordSpacing, totalDuration, startTimeOffset)` - Creates subtitles from file
- `getVideoDuration()` - Gets video duration from active sequence
- `applyWordSpacing(line, spacing)` - Applies word spacing to text
- `toSRTTime(timeInSeconds)` - Converts seconds to SRT time format
- `parseTimeToSeconds(timeStr)` - Parses HH:MM:SS to seconds

### JavaScript Interface

The `main.js` file handles:
- CSInterface initialization
- File input handling
- Timing mode toggle (automated/manual)
- Word spacing controls (slider, input, arrows)
- Time input validation and formatting
- Communication between HTML UI and ExtendScript
- Error handling and user feedback

## Troubleshooting

### Extension Not Appearing

1. Verify the extension is in the correct directory
2. Check that unsigned extensions are enabled (for development)
3. Restart Premiere Pro
4. Check the ExtendScript Toolkit console for errors

### File Loading Issues

- Ensure your text file is saved as UTF-8 or UTF-16 LE
- Check that the file is not corrupted
- Verify file permissions allow reading
- Ensure the file contains valid subtitle text (one per line)

### Caption Track Not Created

- Ensure you have an active sequence in Premiere Pro
- Verify that the sequence has content (for automated timing)
- Check that Premiere Pro supports SRT import (version 25.0+)
- Try using manual timing mode if automated timing fails

### Timing Issues

- **Automated mode**: Ensure your sequence has video content with valid duration
- **Manual mode**: Verify time format is HH:MM:SS (e.g., 00:05:00)
- **End time must be after start time** in manual mode
- Check that time values are within sequence bounds

### Word Spacing Not Applied

- Verify word spacing value is between 0 and 15
- Check that subtitles were successfully created
- Word spacing affects visual appearance in the caption track

## Development

### Building from Source

1. Ensure all files are in the correct directory structure
2. Verify `manifest.xml` points to correct file paths
3. Test in Premiere Pro with unsigned extensions enabled
4. Check browser console (F12) for JavaScript errors
5. Check ExtendScript Toolkit for JSX errors

### Customization

- **Word spacing range**: Modify min/max values in `index.html` and `main.js`
- **Timing algorithm**: Adjust proportional calculation in `extendScript.jsx`
- **UI styling**: Edit `style.css` for visual customization
- **Panel size**: Modify geometry in `manifest.xml`

## License

This project is open source and available under the MIT License.

## Support

For support, questions, or feedback, please contact:
- **Email**: rahulshendre789@gmail.com

## Version History

### 1.0.0
- Initial release
- Automated and manual timing modes
- Proportional word-count-based timing distribution
- Word spacing control
- Support for TXT file format
- Auto-caption track creation
- UTF-8 and UTF-16 encoding support

