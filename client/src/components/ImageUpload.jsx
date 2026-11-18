import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { uploadImage, errorMessage } from "../services/api";
import { HiOutlinePhotograph } from "react-icons/hi";

const MAX_BYTES = 2 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

// Uploads an image and reports its public URL via onChange.
// The browser check below is only for quick feedback; the server re-checks
// the actual file contents.
const ImageUpload = ({ id, label, value, onChange, square = false, hint }) => {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!TYPES.includes(file.type)) return toast.error("Use a JPEG, PNG or WebP image.");
    if (file.size > MAX_BYTES) return toast.error("Images must be 2 MB or smaller.");
    setBusy(true);
    try {
      const res = await uploadImage(file);
      onChange(res.data.data.url);
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="form-group">
      <label htmlFor={id}>{label}</label>
      <div className="image-upload">
        <div className={`image-upload-preview ${square ? "image-upload-preview--square" : ""}`}>
          {value ? <img src={value} alt="" referrerPolicy="no-referrer" /> : <HiOutlinePhotograph aria-hidden="true" size={28} />}
        </div>
        <div className="image-upload-actions">
          <input ref={inputRef} id={id} type="file" accept={TYPES.join(",")} className="sr-only" onChange={pick} />
          <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => inputRef.current?.click()}>
            {busy ? "Uploading..." : value ? "Replace" : "Upload image"}
          </button>
          {value && (
            <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => onChange("")}>Remove</button>
          )}
          <span className="form-hint">{hint || "JPEG, PNG or WebP, up to 2 MB."}</span>
        </div>
      </div>
    </div>
  );
};

export default ImageUpload;
