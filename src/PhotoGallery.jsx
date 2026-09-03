import { useEffect, useRef, useState } from "react";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

const EVENT_TABS = [
  { id: "engagement", label: "Engagement" },
  { id: "reception", label: "Reception" },
  { id: "wedding", label: "Wedding" },
];

const EXIF_DATE_PATTERN = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/;

const readIfd = (view, tiffStart, ifdOffset, little) => {
  const getU16 = (offset) => view.getUint16(offset, little);
  const getU32 = (offset) => view.getUint32(offset, little);
  const entryCount = getU16(ifdOffset);
  const tags = {};

  for (let index = 0; index < entryCount; index += 1) {
    const entryOffset = ifdOffset + 2 + index * 12;
    const tag = getU16(entryOffset);
    const type = getU16(entryOffset + 2);
    const count = getU32(entryOffset + 4);
    const valueOffsetField = entryOffset + 8;

    if (type === 2) {
      const dataOffset = count <= 4 ? valueOffsetField : tiffStart + getU32(valueOffsetField);
      let value = "";

      for (let byteIndex = 0; byteIndex < count - 1; byteIndex += 1) {
        value += String.fromCharCode(view.getUint8(dataOffset + byteIndex));
      }

      tags[tag] = value;
    } else if (type === 3) {
      tags[tag] = count <= 2 ? getU16(valueOffsetField) : getU16(tiffStart + getU32(valueOffsetField));
    } else if (type === 4) {
      tags[tag] = getU32(valueOffsetField);
    }
  }

  return tags;
};

const parseExifCaptureDate = (view, tiffStart) => {
  const little = view.getUint16(tiffStart, false) === 0x4949;
  const ifd0Offset = tiffStart + view.getUint32(tiffStart + 4, little);
  const ifd0Tags = readIfd(view, tiffStart, ifd0Offset, little);

  let dateString = ifd0Tags[0x9003] || ifd0Tags[0x0132];

  if (!dateString && ifd0Tags[0x8769]) {
    const exifIfdTags = readIfd(view, tiffStart, tiffStart + ifd0Tags[0x8769], little);
    dateString = exifIfdTags[0x9003];
  }

  const match = dateString ? EXIF_DATE_PATTERN.exec(dateString) : null;

  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute, second] = match;
  const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const readExifCapturedAt = async (file) => {
  if (file.type !== "image/jpeg") {
    return null;
  }

  try {
    const buffer = await file.slice(0, 131072).arrayBuffer();
    const view = new DataView(buffer);

    if (view.getUint16(0, false) !== 0xffd8) {
      return null;
    }

    let offset = 2;

    while (offset < view.byteLength - 4) {
      if (view.getUint8(offset) !== 0xff) {
        break;
      }

      const marker = view.getUint8(offset + 1);

      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        offset += 2;
        continue;
      }

      if (marker === 0xd9) {
        break;
      }

      const size = view.getUint16(offset + 2, false);

      if (marker === 0xe1) {
        const exifHeaderOffset = offset + 4;

        if (
          view.getUint32(exifHeaderOffset, false) === 0x45786966 &&
          view.getUint16(exifHeaderOffset + 4, false) === 0x0000
        ) {
          return parseExifCaptureDate(view, exifHeaderOffset + 6);
        }
      }

      offset += 2 + size;
    }
  } catch (error) {
    return null;
  }

  return null;
};

const AVATAR_COLORS = ["#a84a5d", "#bd9648", "#7c8553", "#5b67a3"];

const colorForName = (name) => {
  let hash = 0;

  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) >>> 0;
  }

  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

function Avatar({ name }) {
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";

  return (
    <span className="photo-gallery__avatar" style={{ background: colorForName(name || "") }} title={name}>
      {initial}
    </span>
  );
}

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
  const [activeTab, setActiveTab] = useState("engagement");
  const [uploadEvent, setUploadEvent] = useState("engagement");

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

  const selectTab = (tabId) => {
    setActiveTab(tabId);

    if (tabId !== "mine") {
      setUploadEvent(tabId);
    }
  };

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

    const capturedAt = await readExifCapturedAt(file);

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
      body: JSON.stringify({ profileId: profile.id, key: urlPayload.key, url: urlPayload.publicUrl, event: uploadEvent, capturedAt }),
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

  const visiblePhotos = !profile
    ? []
    : activeTab === "mine"
      ? photos.filter((photo) => photo.profileId === profile.id)
      : photos.filter((photo) => photo.event === activeTab);

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

            <nav className="photo-gallery__tabs" aria-label="Photo albums">
              {EVENT_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`photo-gallery__tab${activeTab === tab.id ? " is-active" : ""}`}
                  onClick={() => selectTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
              <button
                type="button"
                className={`photo-gallery__tab${activeTab === "mine" ? " is-active" : ""}`}
                onClick={() => selectTab("mine")}
              >
                My Photos
              </button>
            </nav>

            <div className="photo-gallery__upload">
              <label className="photo-gallery__event-select">
                <span>Uploading to</span>
                <select value={uploadEvent} onChange={(event) => setUploadEvent(event.target.value)}>
                  {EVENT_TABS.map((tab) => (
                    <option value={tab.id} key={tab.id}>{tab.label}</option>
                  ))}
                </select>
              </label>
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
              {visiblePhotos.map((photo) => (
                <figure className="photo-gallery__item" key={photo.id}>
                  <div className="photo-gallery__image-wrap">
                    <img src={photo.url} alt={`Uploaded by ${photo.uploaderName}`} loading="lazy" />
                    <Avatar name={photo.uploaderName} />
                  </div>
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
              {!visiblePhotos.length && (
                <p className="photo-gallery__message">
                  {activeTab === "mine" ? "You haven't uploaded any photos yet." : "No photos yet — be the first to share one!"}
                </p>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

export default PhotoGallery;
