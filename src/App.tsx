import { useVideoChat } from '@/hooks/useVideoChat';
import { HomePage } from '@/pages/HomePage';
import { CallPage } from '@/pages/CallPage';

export default function App() {
  const {
    callState,
    localStream,
    remoteStream,
    cameraEnabled,
    micEnabled,
    cameraError,
    errorMessage,
    connect,
    next,
    endCall,
    toggleCamera,
    toggleMic,
  } = useVideoChat();

  if (callState === 'IDLE') {
    return <HomePage onConnect={connect} cameraError={cameraError} />;
  }

  return (
    <CallPage
      callState={callState}
      localStream={localStream}
      remoteStream={remoteStream}
      cameraEnabled={cameraEnabled}
      micEnabled={micEnabled}
      errorMessage={errorMessage}
      onToggleMic={toggleMic}
      onToggleCamera={toggleCamera}
      onNext={next}
      onEnd={endCall}
    />
  );
}
