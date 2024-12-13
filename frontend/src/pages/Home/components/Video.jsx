import { useEffect, useState, useRef } from "react";
import "./video.scss";

const Video = ({ socket, video }) => {
    const [selectedVideo, setSelectedVideo] = useState(false);
    const [frames, setFrames] = useState([]); // Almacenar todos los frames recibidos
    const [metadata, setMetadata] = useState([]); // Almacenar toda la metadta recibida
    const [currentFrameIndex, setCurrentFrameIndex] = useState(0); // Índice del frame actual
    const [isPlaying, setIsPlaying] = useState(false); // Estado de reproducción
    const intervalRef = useRef(null);

    const handlePlayVideo = (video) => {
        setSelectedVideo(true);
        setFrames([]); // Reinicia los frames
        setCurrentFrameIndex(0); // Reinicia el índice actual
        setIsPlaying(true); // Activa la reproducción automática
        socket.emit('process_video', { filename: video });
    };

    const handlePause = () => {
        setIsPlaying(false);
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
    };

    const handlePlay = () => {
        setIsPlaying(true);
    };

    const handleNextFrame = () => {
        if (currentFrameIndex < frames.length - 1) {
            setCurrentFrameIndex(currentFrameIndex + 1);
        }
    };

    const handlePrevFrame = () => {
        if (currentFrameIndex > 0) {
            setCurrentFrameIndex(currentFrameIndex - 1);
        }
    };

    const handleSeek = (event) => {
        const targetFrameIndex = Math.floor(
            (event.target.value / 100) * (frames.length - 1)
        );
        setCurrentFrameIndex(targetFrameIndex);
    };

    useEffect(() => {
        if (isPlaying) {
            intervalRef.current = setInterval(() => {
                setCurrentFrameIndex((prevIndex) =>
                    prevIndex < frames.length - 1 ? prevIndex + 1 : prevIndex
                );
            }, 100); // Ajusta el tiempo entre frames (en milisegundos)
        } else {
            clearInterval(intervalRef.current);
        }

        return () => {
            clearInterval(intervalRef.current);
        };
    }, [isPlaying, frames]);

    // console.log(metadata[currentFrameIndex]);
    useEffect(() => {
        // Recibir frames desde el servidor
        socket.on('frame', (data) => {
            const base64Frame = `data:image/jpeg;base64,${btoa(
                new Uint8Array(data.frame).reduce((data, byte) => data + String.fromCharCode(byte), '')
            )}`;
            setFrames((prevFrames) => [...prevFrames, base64Frame]);
            setMetadata((prevMetadata) => [...prevMetadata, data.metadata]);
        });

        socket.on('end_of_video', () => {
            console.log('Video completo');
            setIsPlaying(false); // Detén la reproducción al finalizar el video
        });

        socket.on("error", (error) => {
            console.log(error);
        });

        return () => {
            socket.off('frame');
            socket.off('end_of_video');
        };
    }, [socket]);

    useEffect(() => {
        const keepAliveInterval = setInterval(() => {
            if (socket.connected) {
                socket.emit("keep_alive", { message: "Estoy vivo" });
            }
        }, 10000); // Cada 10 segundos

        return () => clearInterval(keepAliveInterval);
    }, [socket]);

    const currentMetadata = metadata[currentFrameIndex];

    return (
        <div className="video">
            <button onClick={() => handlePlayVideo(video)}>Conectar a la cámara {video}</button>
            {selectedVideo && (
                <div className="video-content">
                    <h2>Reproduciendo: {video}</h2>
                    {frames.length > 0 ? (
                        <div className="video-reproductor">
                            <div className="video-reproductor-content">
                                <div className="video-rep-div">
                                    <img
                                        className="video-rep"
                                        src={frames[currentFrameIndex]}
                                        alt="Current Frame"
                                    />
                                </div>
                                <div className="video-reproductor-buttons">
                                    <button onClick={handlePrevFrame} disabled={currentFrameIndex === 0}>
                                        {"<<"}
                                    </button>
                                    <button onClick={handlePause} disabled={!isPlaying}>
                                        Pausa
                                    </button>
                                    <button onClick={handlePlay} disabled={isPlaying}>
                                        Play
                                    </button>
                                    <button
                                        onClick={handleNextFrame}
                                        disabled={currentFrameIndex >= frames.length - 1}
                                    >
                                        {">>"}
                                    </button>
                                </div>
                                <div className="video-reproductor-bar">
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={(currentFrameIndex / (frames.length - 1)) * 100 || 0}
                                        onChange={handleSeek}
                                    />
                                </div>
                            </div>
                            <div className="video-metadata">
                                <p>Frame: {currentMetadata.frame_index}</p>
                                <p>Tiempo: {currentMetadata.frame_time.toFixed(2)}</p>
                                <p>Detecciones {currentMetadata.detections.length}</p>
                                <ol className="video-metadata-objects">
                                    {currentMetadata.detections.map((object, index) => (
                                        <li key={index}>{object.label}</li>
                                    ))}
                                </ol>
                            </div>
                        </div>
                    ) : (
                        <p>Cargando...</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default Video;
