"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
    Camera, Upload, X, Loader2, MapPin, Clock, MessageSquare,
    Trash2, ZoomIn, Image as ImageIcon, RotateCcw,
} from "lucide-react";

export interface Photo {
    id: string;
    url: string;
    caption: string | null;
    latitude: number | null;
    longitude: number | null;
    takenAt: string;
    uploadedBy?: { firstName: string; lastName: string } | null;
}

interface Props {
    entityId: string;
    apiPath: string; // e.g., "/api/reports" or "/api/daily-logs" or "/api/incidents"
    photos: Photo[];
    onPhotosChange: (photos: Photo[]) => void;
    readOnly?: boolean;
    onLocalCapture?: (blob: Blob, caption: string, coords: { lat: number; lng: number } | null) => void;
}

export default function PhotoCapture({ entityId, apiPath, photos, onPhotosChange, readOnly, onLocalCapture }: Props) {
    const [showCamera, setShowCamera] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [caption, setCaption] = useState("");
    const [gpsStatus, setGpsStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
    const [viewPhoto, setViewPhoto] = useState<Photo | null>(null);
    const [editingCaption, setEditingCaption] = useState<string | null>(null);
    const [editCaption, setEditCaption] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [cameraSupport, setCameraSupport] = useState<boolean>(true);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    // Initial check for camera support
    useEffect(() => {
        if (typeof window !== "undefined" && (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia)) {
            setCameraSupport(false);
        }
    }, []);

    // Get GPS position
    const getGPS = useCallback(() => {
        setGpsStatus("loading");
        if (!navigator.geolocation) {
            setGpsStatus("error");
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setGpsStatus("ok");
            },
            () => setGpsStatus("error"),
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }, []);

    // Start camera
    const startCamera = useCallback(async () => {
        setShowCamera(true);
        setPreviewUrl(null);
        setPreviewBlob(null);
        setCaption("");
        getGPS();
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setError("La caméra n'est pas accessible. Assurez-vous d'utiliser une connexion sécurisée (HTTPS).");
                setShowCamera(false);
                return;
            }
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err: any) {
            console.error("Camera error:", err);
            setError(err.name === "NotAllowedError" ? "Accès à la caméra refusé." : "Impossible de démarrer la caméra.");
            setShowCamera(false);
        }
    }, [getGPS]);

    // Stop camera
    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
        setShowCamera(false);
        setPreviewUrl(null);
        setPreviewBlob(null);
    }, []);

    // Take photo
    const takePhoto = useCallback(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Draw video frame
        ctx.drawImage(video, 0, 0);

        // Watermark: date, time, GPS
        const now = new Date();
        const dateStr = now.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
        const timeStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        const gpsStr = coords
            ? `GPS: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`
            : "GPS: Non disponible";

        // Semi-transparent background strip
        const stripH = Math.max(60, canvas.height * 0.06);
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(0, canvas.height - stripH, canvas.width, stripH);

        // Text
        const fontSize = Math.max(14, Math.floor(canvas.height * 0.018));
        ctx.font = `bold ${fontSize}px 'Segoe UI', system-ui, sans-serif`;
        ctx.fillStyle = "#ffffff";
        ctx.textBaseline = "bottom";
        const y = canvas.height - stripH / 4;
        ctx.fillText(`📅 ${dateStr}  🕐 ${timeStr}`, 12, y);

        ctx.textAlign = "right";
        ctx.font = `${fontSize * 0.9}px 'Segoe UI', system-ui, sans-serif`;
        ctx.fillStyle = "#94f7c7";
        ctx.fillText(`📍 ${gpsStr}`, canvas.width - 12, y);
        ctx.textAlign = "left";

        // Convert to blob
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    setPreviewUrl(URL.createObjectURL(blob));
                    setPreviewBlob(blob);
                }
            },
            "image/jpeg",
            0.92
        );

        // Stop video stream
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
    }, [coords]);

    // Handle file selection (from gallery)
    const handleFileSelect = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;
            getGPS();
            setPreviewUrl(URL.createObjectURL(file));
            setPreviewBlob(file);
            setShowCamera(true); // reuse the preview UI
            setCaption("");
        },
        [getGPS]
    );

    // Upload photo
    const uploadPhoto = useCallback(async () => {
        if (!previewBlob) return;

        if (entityId === "new" && onLocalCapture) {
            onLocalCapture(previewBlob, caption.trim(), coords);
            stopCamera();
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append("photo", previewBlob, `photo_${Date.now()}.jpg`);
        if (caption.trim()) formData.append("caption", caption.trim());
        if (coords) {
            formData.append("latitude", coords.lat.toString());
            formData.append("longitude", coords.lng.toString());
        }
        formData.append("takenAt", new Date().toISOString());

        try {
            const res = await fetch(`${apiPath}/${entityId}/photos`, {
                method: "POST",
                body: formData,
            });
            if (res.ok) {
                const newPhoto = await res.json();
                onPhotosChange([newPhoto, ...photos]);
                stopCamera();
            }
        } catch (err) {
            console.error("Upload error:", err);
        }
        setUploading(false);
    }, [previewBlob, caption, coords, entityId, apiPath, photos, onPhotosChange, stopCamera, onLocalCapture]);

    // Delete photo
    const deletePhoto = useCallback(
        async (photoId: string) => {
            await fetch(`${apiPath}/${entityId}/photos`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ photoId }),
            });
            onPhotosChange(photos.filter((p) => p.id !== photoId));
            setViewPhoto(null);
        },
        [entityId, apiPath, photos, onPhotosChange]
    );

    // Update caption
    const saveCaption = useCallback(
        async (photoId: string) => {
            await fetch(`${apiPath}/${entityId}/photos`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ photoId, caption: editCaption }),
            });
            onPhotosChange(
                photos.map((p) => (p.id === photoId ? { ...p, caption: editCaption || null } : p))
            );
            setEditingCaption(null);
        },
        [entityId, apiPath, editCaption, photos, onPhotosChange]
    );

    // Cleanup streams on unmount
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop());
            }
        };
    }, []);

    const formatDateTime = (d: string) =>
        new Date(d).toLocaleString("fr-FR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });

    return (
        <div className="space-y-3">
            {/* Action Buttons */}
            {!readOnly && !showCamera && (
                <div className="flex gap-2">
                    <button
                        onClick={cameraSupport ? startCamera : () => cameraInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all text-sm font-medium"
                        title={!cameraSupport ? "Utilise l'appareil photo natif (Fallback HTTP)" : ""}
                    >
                        <Camera className="w-4 h-4" /> Prendre une photo
                    </button>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-700/50 text-slate-300 border border-border-dark hover:bg-slate-700 hover:text-white transition-all text-sm font-medium"
                    >
                        <Upload className="w-4 h-4" /> Importer
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileSelect}
                    />
                    <input
                        ref={cameraInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={handleFileSelect}
                    />
                </div>
            )}

            {/* Camera / Preview */}
            {showCamera && (
                <div className="relative bg-black rounded-2xl overflow-hidden border border-border-dark">
                    {error && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6 text-center">
                            <div className="space-y-3">
                                <div className="w-12 h-12 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto">
                                    <X className="w-6 h-6" />
                                </div>
                                <p className="text-sm text-red-400 font-medium">{error}</p>
                                <button
                                    onClick={() => { setError(null); setShowCamera(false); }}
                                    className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs hover:bg-slate-700 transition-colors"
                                >
                                    Fermer
                                </button>
                            </div>
                        </div>
                    )}
                    {!previewUrl ? (
                        // Live camera view
                        <div className="relative">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full max-h-[50vh] object-cover"
                            />
                            {/* GPS status overlay */}
                            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs">
                                <MapPin className={`w-3 h-3 ${gpsStatus === "ok" ? "text-emerald-400" : gpsStatus === "error" ? "text-red-400" : "text-amber-400 animate-pulse"}`} />
                                <span className={gpsStatus === "ok" ? "text-emerald-400" : gpsStatus === "error" ? "text-red-400" : "text-amber-400"}>
                                    {gpsStatus === "ok" && coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : gpsStatus === "loading" ? "Localisation..." : "GPS indisponible"}
                                </span>
                            </div>
                            {/* Time overlay */}
                            <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs text-white">
                                <Clock className="w-3 h-3" />
                                {new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                            </div>
                            {/* Camera controls */}
                            <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4">
                                <button
                                    onClick={stopCamera}
                                    className="p-3 bg-red-500/80 hover:bg-red-500 text-white rounded-full transition-colors"
                                    title="Annuler"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={takePhoto}
                                    className="p-5 bg-white rounded-full shadow-xl hover:scale-105 transition-transform ring-4 ring-white/30"
                                    title="Capturer"
                                >
                                    <Camera className="w-6 h-6 text-gray-900" />
                                </button>
                                <div className="w-11" /> {/* spacer */}
                            </div>
                        </div>
                    ) : (
                        // Preview captured photo
                        <div className="relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={previewUrl} alt="Aperçu" className="w-full max-h-[50vh] object-contain bg-black" />
                            {/* Caption input */}
                            <div className="p-4 bg-surface-dark border-t border-border-dark">
                                <div className="flex items-start gap-2 mb-3">
                                    <MessageSquare className="w-4 h-4 text-primary mt-2 shrink-0" />
                                    <input
                                        type="text"
                                        value={caption}
                                        onChange={(e) => setCaption(e.target.value)}
                                        placeholder="Ajouter un commentaire à cette photo..."
                                        className="input-field flex-1"
                                    />
                                </div>
                                {/* GPS info */}
                                <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                                    <span className="flex items-center gap-1">
                                        <MapPin className={`w-3 h-3 ${coords ? "text-emerald-400" : "text-red-400"}`} />
                                        {coords ? `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}` : "GPS non disponible"}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {new Date().toLocaleString("fr-FR")}
                                    </span>
                                </div>
                                {/* Action buttons */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setPreviewUrl(null);
                                            setPreviewBlob(null);
                                            startCamera();
                                        }}
                                        className="btn-secondary flex-1 text-sm"
                                    >
                                        <RotateCcw className="w-4 h-4" /> Reprendre
                                    </button>
                                    <button
                                        onClick={uploadPhoto}
                                        disabled={uploading}
                                        className="btn-primary flex-1 text-sm"
                                    >
                                        {uploading ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Upload className="w-4 h-4" />
                                        )}
                                        Joindre au rapport
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    <canvas ref={canvasRef} className="hidden" />
                </div>
            )}

            {/* Photo Grid */}
            {photos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {photos.map((photo) => (
                        <div
                            key={photo.id}
                            className="relative group rounded-xl overflow-hidden border border-border-dark bg-slate-900 cursor-pointer aspect-square"
                            onClick={() => setViewPhoto(photo)}
                        >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={photo.url}
                                alt={photo.caption || "Photo rapport"}
                                className="w-full h-full object-cover"
                            />
                            {/* Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                                {photo.caption && (
                                    <p className="text-[10px] text-white line-clamp-2 mb-1">{photo.caption}</p>
                                )}
                                <div className="flex items-center gap-2 text-[9px] text-slate-400">
                                    {photo.latitude && (
                                        <span className="flex items-center gap-0.5">
                                            <MapPin className="w-2.5 h-2.5 text-emerald-400" />
                                            GPS
                                        </span>
                                    )}
                                    <span className="flex items-center gap-0.5">
                                        <Clock className="w-2.5 h-2.5" />
                                        {formatDateTime(photo.takenAt)}
                                    </span>
                                </div>
                            </div>
                            {/* Zoom icon */}
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <ZoomIn className="w-4 h-4 text-white drop-shadow" />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Empty state */}
            {photos.length === 0 && readOnly && (
                <div className="text-center py-8 text-slate-500">
                    <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Aucune photo jointe</p>
                </div>
            )}

            {/* Full-screen Photo Viewer */}
            {viewPhoto && (
                <div
                    className="fixed inset-0 bg-black/90 z-[70] flex items-center justify-center p-4"
                    onClick={() => { setViewPhoto(null); setEditingCaption(null); }}
                >
                    <div
                        className="bg-surface-dark border border-border-dark rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-fade-in"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Photo */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={viewPhoto.url}
                            alt={viewPhoto.caption || "Photo"}
                            className="w-full max-h-[60vh] object-contain bg-black rounded-t-2xl"
                        />
                        {/* Info */}
                        <div className="p-4 space-y-3">
                            {/* Caption */}
                            <div>
                                {editingCaption === viewPhoto.id ? (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={editCaption}
                                            onChange={(e) => setEditCaption(e.target.value)}
                                            className="input-field flex-1"
                                            placeholder="Commentaire..."
                                            autoFocus
                                        />
                                        <button
                                            onClick={() => saveCaption(viewPhoto.id)}
                                            className="btn-primary text-xs px-3"
                                        >
                                            OK
                                        </button>
                                        <button
                                            onClick={() => setEditingCaption(null)}
                                            className="btn-secondary text-xs px-3"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-start gap-2">
                                        <MessageSquare className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                                        {viewPhoto.caption ? (
                                            <p
                                                className="text-sm text-slate-300 cursor-pointer hover:text-white transition-colors"
                                                onClick={(e) => {
                                                    if (!readOnly) {
                                                        e.stopPropagation();
                                                        setEditingCaption(viewPhoto.id);
                                                        setEditCaption(viewPhoto.caption || "");
                                                    }
                                                }}
                                            >
                                                {viewPhoto.caption}
                                            </p>
                                        ) : (
                                            !readOnly && (
                                                <button
                                                    className="text-xs text-slate-500 hover:text-primary transition-colors"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingCaption(viewPhoto.id);
                                                        setEditCaption("");
                                                    }}
                                                >
                                                    + Ajouter commentaire
                                                </button>
                                            )
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Metadata */}
                            <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                                <span className="flex items-center gap-1.5 bg-slate-800/50 rounded-lg px-3 py-1.5">
                                    <Clock className="w-3.5 h-3.5" />
                                    {formatDateTime(viewPhoto.takenAt)}
                                </span>
                                {viewPhoto.latitude && viewPhoto.longitude && (
                                    <a
                                        href={`https://www.google.com/maps?q=${viewPhoto.latitude},${viewPhoto.longitude}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg px-3 py-1.5 hover:bg-emerald-500/20 transition-colors"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <MapPin className="w-3.5 h-3.5" />
                                        {viewPhoto.latitude.toFixed(6)}, {viewPhoto.longitude.toFixed(6)}
                                    </a>
                                )}
                                {viewPhoto.uploadedBy && (
                                    <span className="flex items-center gap-1.5 bg-slate-800/50 rounded-lg px-3 py-1.5">
                                        Par {viewPhoto.uploadedBy.firstName} {viewPhoto.uploadedBy.lastName}
                                    </span>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-between pt-2 border-t border-border-dark/50">
                                <button
                                    onClick={() => { setViewPhoto(null); setEditingCaption(null); }}
                                    className="text-xs text-slate-400 hover:text-white transition-colors"
                                >
                                    Fermer
                                </button>
                                {!readOnly && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm("Supprimer cette photo ?")) {
                                                deletePhoto(viewPhoto.id);
                                            }
                                        }}
                                        className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" /> Supprimer
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
