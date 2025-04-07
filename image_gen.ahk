; filepath: d:\Documents\programming projects\AI image porjects\ai-image-generator\image_gen.ahk
#NoEnv  ; Recommended for performance and compatibility with future AutoHotkey releases.
#SingleInstance Force
SendMode Input  ; Recommended for new scripts due to its superior speed and reliability.
SetWorkingDir %A_ScriptDir%  ; Ensures a consistent starting directory.

; Configuration - Edit these values if needed
ServerUrl := "http://localhost:15303"
ImageModel := "midjourney"
ImageWidth := 1920
ImageHeight := 1280

; Global hotkey: Shift+I
+i::
    ; Store current clipboard contents
    ClipSaved := ClipboardAll
    
    ; Clear clipboard
    Clipboard := ""
    
    ; Copy the selected text
    Send, ^c
    ClipWait, 1
    
    if ErrorLevel
    {
        MsgBox, No text was selected.
        Return
    }
    
    ; Get the selected text
    SelectedText := Clipboard
    
    ; Show tooltip to indicate processing
    ToolTip, Generating image from text...
    
    ; Run the Python script to generate and retrieve the image
    PythonScript := A_ScriptDir . "\image_selection_helper.py"
    Command := ComSpec . " /c " . "python """ . PythonScript . """ --server """ . ServerUrl . """ --model """ . ImageModel . """ --width " . ImageWidth . " --height " . ImageHeight . """"
    
    ; Run the Python script and wait for it to indicate the image is ready
    RunWait, %Command%,, Hide, ProcessID
    
    ; Check if the image generation was successful
    if (ErrorLevel = 0)
    {
        ; Image should now be in clipboard, paste it
        ToolTip, Image ready, pasting...
        Sleep, 500
        Send, ^v
        Sleep, 500
        ToolTip
    }
    else
    {
        ; Restore the original clipboard contents
        Clipboard := ClipSaved
        ToolTip, Failed to generate image.
        Sleep, 2000
        ToolTip
    }
    
    ; Clean up
    ClipSaved := ""
Return