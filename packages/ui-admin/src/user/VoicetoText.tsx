import { Dialog } from '@blueprintjs/core'
import React, { useState } from 'react'
import { useReactMediaRecorder } from 'react-media-recorder'

interface VoiceRecorderProps {
  isOpen: boolean
  toggle: () => void
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ isOpen, toggle }) => {
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { startRecording, stopRecording, mediaBlobUrl } = useReactMediaRecorder({
    audio: true,
    onStop: async (blobUrl, blob) => {
      try {
        if (!blob) {
          throw new Error('No audio data received')
        }

        //setIsProcessing(true)
        setError(null)

        // Convert Blob to ArrayBuffer for potential client-side processing
        const audioBuffer = await blob.arrayBuffer()
        console.log('Audio buffer:', audioBuffer)

        // Send to server
        const serverResponse = await sendAudioToServer(blob)

        // Handle server response
        if (!serverResponse.success) {
          throw new Error(serverResponse.error || 'Server processing failed')
        }

        console.log('Server response:', serverResponse)
        return serverResponse.transcript
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Audio processing failed')
        return null
      } finally {
        //setIsProcessing(false)
      }
    },
  })

  const sendAudioToServer = async (audioBlob: Blob) => {
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')

      const response = await fetch('https://www.app.xmati.ai/apis/gemini-voice', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Server communication error:', error)
      throw error // Re-throw for upstream handling
    }
  }


  const handleStart = () => {
    setError(null)
    setIsRecording(true)
    try {
      startRecording()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const handleStop = () => {
    stopRecording()
  }

  return (
    <Dialog
      title="Voice to Text"
      isOpen={isOpen}
      onClose={toggle}
      style={{ width: '500px' }}
    >
      <div className="voice-recorder">
        {error && <div className="error-message">{error}</div>}

        <div className="controls">
          <button
            onClick={handleStart}
            disabled={isRecording}
            className="record-button"
          >
            Start Recording
          </button>

          <button
            onClick={handleStop}
            disabled={!isRecording}
            className="stop-button"
          >
            Stop Recording
          </button>
        </div>

        {mediaBlobUrl && (
          <div className="audio-preview">
            <audio src={mediaBlobUrl} controls />
          </div>
        )}
      </div>
    </Dialog>
  )
}

export default VoiceRecorder
