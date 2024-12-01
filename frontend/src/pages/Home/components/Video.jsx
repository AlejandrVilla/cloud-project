import { useEffect, useState } from "react";

const Video = ({ socket, video }) => {
    const [selectedVideo, setSelectedVideo] = useState(false);
    const [currentFrame, setCurrentFrame] = useState(null);

    const handlePlayVideo = (video) => {
        setSelectedVideo(true);
        setCurrentFrame(null); // Reinicia el frame actual
        socket.emit('process_video', { filename: video });
    };
    // console.log(currentFrame);
    useEffect(() => {
        // Recibir frames desde el servidor
        socket.on('frame', (frame) => {
            const base64Frame = `data:image/jpeg;base64,${btoa(
                new Uint8Array(frame).reduce((data, byte) => data + String.fromCharCode(byte), '')
            )}`;
            setCurrentFrame(base64Frame); // Actualiza el frame actual
        });

        socket.on('end_of_video', () => {
            alert('Video completo');
        });

        socket.on("error", (error) => {
            console.log(error);
        })

        return () => {
            socket.off('frame');
            socket.off('end_of_video');
        };
    }, [socket]);

    return (
        <div>
            <button onClick={() => handlePlayVideo(video)}>Conectar a la camara {video}</button>
            {
                selectedVideo && (
                    <div>
                        <h2>Reproduciendo: {video}</h2>
                        <div>
                            {currentFrame ? (
                                <img src={currentFrame} alt="Current Frame" style={{ width: '100%' }} />
                            ) : (
                                <p>Cargando...</p>
                            )}
                        </div>
                    </div>
                )
            }
        </div>
    );
}

export default Video;