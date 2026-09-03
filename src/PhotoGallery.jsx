import { useEffect, useRef, useState } from "react";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

function ProfileForm({ onCreated }) {
  const [form, setForm] = useState({ name: "", phone: "" });
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/gallery/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to save your details.");
      }

      onCreated(payload.profile);
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Unable to save your details.");
    }
  };

  return (
    <form className="photo-gallery__card" onSubmit={submit}>
      <p className="eyebrow">Upload photos</p>
      <h3>Join the photo wall</h3>
      <p className="photo-gallery__intro">Add your name and phone number to start uploading and browsing photos from the celebration.</p>
      <label className="rsvp-field">
        <span>Name</span>
        <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
      </label>
      <label className="rsvp-field">
        <span>Phone number</span>
        <input value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} required />
      </label>
      <button className="button" type="submit" disabled={status === "loading"}>
        {status === "loading" ? "Joining..." : "Continue"}
      </button>
      {message && <p className="photo-gallery__message photo-gallery__message--error">{message}</p>}
    </form>
  );
}

function PhotoGallery() {
  const fileInputRef = useRef(null);
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const [photos, setPhotos] = useState([]);
  const [uploadCount, setUploadCount] = useState(0);

  const loadPhotos = async () => {
    try {
      const response = await fetch("/api/gallery/photos");
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to load photos.");
      }

      setPhotos(payload.photos);
    } catch (error) {
      setMessage(error.message || "Unable to load photos.");
    }
  };

  useEffect(() => {
    const savedId = window.localStorage.getItem("galleryProfileId");

    if (!savedId) {
      setStatus("idle");
      return;
    }

    let isMounted = true;

    fetch(`/api/gallery/profile?id=${encodeURIComponent(savedId)}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Profile not found.");
        }

        return response.json();
      })
      .then(({ profile: savedProfile }) => {
        if (!isMounted) {
          return;
        }

        setProfile(savedProfile);
        setStatus("idle");
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        window.localStorage.removeItem("galleryProfileId");
        window.localStorage.removeItem("galleryProfileName");
        setStatus("idle");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (profile) {
      loadPhotos();
    }
  }, [profile?.id]);

  const onProfileCreated = (createdProfile) => {
    window.localStorage.setItem("galleryProfileId", createdProfile.id);
    window.localStorage.setItem("galleryProfileName", createdProfile.name);
    setProfile(createdProfile);
  };

  const switchProfile = () => {
    window.localStorage.removeItem("galleryProfileId");
    window.localStorage.removeItem("galleryProfileName");
    setProfile(null);
    setPhotos([]);
  };

  const uploadFile = async (file) => {
    if (!file.type.startsWith("image/")) {
      throw new Error(`${file.name} is not an image.`);
    }

    if (file.size > MAX_FILE_BYTES) {
      throw new Error(`${file.name} is larger than 10MB.`);
    }

    const urlResponse = await fetch("/api/gallery/upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profileId: profile.id,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      }),
    });
    const urlPayload = await urlResponse.json();

    if (!urlResponse.ok) {
      throw new Error(urlPayload.error || `Unable to prepare upload for ${file.name}.`);
    }

    const putResponse = await fetch(urlPayload.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });

    if (!putResponse.ok) {
      throw new Error(`Unable to upload ${file.name}.`);
    }

    const saveResponse = await fetch("/api/gallery/photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId: profile.id, key: urlPayload.key, url: urlPayload.publicUrl }),
    });
    const savePayload = await saveResponse.json();

    if (!saveResponse.ok) {
      throw new Error(savePayload.error || `Unable to save ${file.name}.`);
    }

    return savePayload.photo;
  };

  const handleFiles = async (event) => {
    const files = Array.from(event.target.files || []);

    if (!files.length) {
      return;
    }

    setMessage("");
    setUploadCount(files.length);

    for (const file of files) {
      try {
        const photo = await uploadFile(file);
        setPhotos((current) => [photo, ...current]);
      } catch (error) {
        setMessage(error.message || "Unable to upload photo.");
      } finally {
        setUploadCount((current) => Math.max(0, current - 1));
      }
    }

    event.target.value = "";
  };

  const deletePhoto = async (photo) => {
    if (!window.confirm("Delete this photo?")) {
      return;
    }

    setPhotos((current) => current.filter((item) => item.id !== photo.id));

    try {
      const response = await fetch("/api/gallery/photos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: photo.id, profileId: profile.id }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || "Unable to delete photo.");
      }
    } catch (error) {
      setMessage(error.message || "Unable to delete photo.");
      loadPhotos();
    }
  };

  return (
    <main className="photo-gallery-page">
      <section className="photo-gallery">
        {status === "loading" ? (
          <p className="photo-gallery__message">Loading...</p>
        ) : !profile ? (
          <ProfileForm onCreated={onProfileCreated} />
        ) : (
          <>
            <header className="photo-gallery__header">
              <div>
                <p className="eyebrow">Upload photos</p>
                <h3>Hi {profile.name}</h3>
              </div>
              <button className="button button--ghost" type="button" onClick={switchProfile}>
                Switch profile
              </button>
            </header>

            <div className="photo-gallery__upload">
              <button
                className="button"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadCount > 0}
              >
                {uploadCount > 0 ? `Uploading ${uploadCount}...` : "Upload photos"}
              </button>
              <input
                ref={fileInputRef}
                className="photo-gallery__file-input"
                type="file"
                accept="image/*"
                multiple
                onChange={handleFiles}
              />
            </div>

            {message && <p className="photo-gallery__message photo-gallery__message--error">{message}</p>}

            <div className="photo-gallery__grid">
              {photos.map((photo) => (
                <figure className="photo-gallery__item" key={photo.id}>
                  <img src={photo.url} alt={`Uploaded by ${photo.uploaderName}`} loading="lazy" />
                  <figcaption>
                    <span>{photo.uploaderName}</span>
                    {photo.profileId === profile.id && (
                      <button className="photo-gallery__delete" type="button" onClick={() => deletePhoto(photo)}>
                        Delete
                      </button>
                    )}
                  </figcaption>
                </figure>
              ))}
              {!photos.length && <p className="photo-gallery__message">No photos yet — be the first to share one!</p>}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

export default PhotoGallery;
