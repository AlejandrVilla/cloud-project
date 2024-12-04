import axios from "axios";
import { useState } from "react";

const UPLOAD_URL = `${import.meta.env.VITE_SERVER_URL}/upload`;
// const UPLOAD_URL = "http://127.0.0.1:5000/upload";

const UploadVideo = () => {
    const [videoFile, setVideoFile] = useState(null);

    const handleVideoChange = (e) => {
        const video = e.target.files[0];
        setVideoFile(video);
        console.log(video)
    }

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!videoFile) {
            console.log("No hay un video cargado");
            return
        }
        const formData = new FormData();
        formData.append('video', videoFile);
        try {
            console.log(`subiendo video ${videoFile.name}`);
            const response = await axios.post(
                UPLOAD_URL,
                formData,              
                {
                    headers: { "Content-Type": "multipart/form-data"},
                }
            );
            const data = response.data;
            console.log(data); 
        }catch (error){
            console.log(`error ${error}`)
        }
    }

    return (
        <div>
            <form onSubmit={handleUpload}>
                <input type="file" accept="video/*" onChange={handleVideoChange}></input>
                <button type="submit">Subir Video</button>
            </form>
        </div>
    );
}

export default UploadVideo;