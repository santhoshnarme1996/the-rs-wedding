import { useEffect, useRef, useState } from "react";
import { weddingData } from "./data";

function useCountdown(targetDate) {
  const calculate = () => {
    const diff = Math.max(new Date(targetDate).getTime() - Date.now(), 0);

    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff / 3600000) % 24),
      minutes: Math.floor((diff / 60000) % 60),
    };
  };

  const [timeLeft, setTimeLeft] = useState(calculate);

  useEffect(() => {
    const intervalId = window.setInterval(() => setTimeLeft(calculate()), 30000);

    return () => window.clearInterval(intervalId);
  }, [targetDate]);

  return timeLeft;
}

function useRevealOnScroll() {
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll("[data-reveal]"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14 }
    );

    nodes.forEach((node) => observer.observe(node));

    return () => observer.disconnect();
  }, []);
}

function usePetals(canvasRef) {
  useEffect(() => {
    const canvas = canvasRef.current;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!canvas || reducedMotion) {
      return undefined;
    }

    const context = canvas.getContext("2d");
    const parent = canvas.parentElement;
    const palette = ["#f4c4ce", "#f7d9e0", "#ffffff", "#cdd3f0", "#f6c9b6"];
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let frameId = 0;
    let width = 0;
    let height = 0;
    let petals = [];

    const createPetal = (fromTop) => ({
      x: Math.random() * width,
      y: fromTop ? -24 : Math.random() * height,
      size: 5 + Math.random() * 8,
      angle: Math.random() * Math.PI * 2,
      angularVelocity: (Math.random() - 0.5) * 0.025,
      velocityY: 0.22 + Math.random() * 0.48,
      sway: 0.35 + Math.random() * 0.8,
      phase: Math.random() * Math.PI * 2,
      color: palette[Math.floor(Math.random() * palette.length)],
      opacity: 0.35 + Math.random() * 0.4,
    });

    const resize = () => {
      const bounds = parent.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (!petals.length) {
        const amount = Math.max(14, Math.min(32, Math.round(width / 24)));
        petals = Array.from({ length: amount }, () => createPetal(false));
      }
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);

      petals.forEach((petal) => {
        petal.y += petal.velocityY;
        petal.phase += 0.01;
        petal.x += Math.sin(petal.phase) * petal.sway * 0.38;
        petal.angle += petal.angularVelocity;

        if (petal.y > height + 26) {
          Object.assign(petal, createPetal(true));
        }

        context.save();
        context.translate(petal.x, petal.y);
        context.rotate(petal.angle);
        context.globalAlpha = petal.opacity;
        context.fillStyle = petal.color;
        context.beginPath();
        context.ellipse(0, 0, petal.size * 0.48, petal.size, 0, 0, Math.PI * 2);
        context.fill();
        context.restore();
      });

      frameId = window.requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
    };
  }, [canvasRef]);
}

function KolamHalo() {
  const petals = Array.from({ length: 8 }, (_, index) => index * 45);
  const innerPetals = Array.from({ length: 8 }, (_, index) => 22.5 + index * 45);

  return (
    <div className="kolam-halo" aria-hidden="true">
      <svg viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="90" fill="none" stroke="#bd9648" strokeWidth="0.8" opacity="0.7" />
        <circle cx="100" cy="100" r="74" fill="none" stroke="#bd9648" strokeWidth="4" strokeLinecap="round" strokeDasharray="0.1 18.6" opacity="0.65" />
        {petals.map((rotation) => (
          <path
            key={rotation}
            d="M100 100C84 74 84 47 100 25C116 47 116 74 100 100Z"
            fill="none"
            stroke="#bd9648"
            strokeWidth="1.3"
            transform={`rotate(${rotation} 100 100)`}
          />
        ))}
        {innerPetals.map((rotation) => (
          <path
            key={rotation}
            d="M100 100C91 83 91 63 100 49C109 63 109 83 100 100Z"
            fill="none"
            stroke="#7f8bc4"
            strokeWidth="1.1"
            transform={`rotate(${rotation} 100 100)`}
          />
        ))}
        <circle cx="100" cy="100" r="11" fill="none" stroke="#bd9648" strokeWidth="1.2" />
        <circle cx="100" cy="100" r="3.4" fill="#cf6f81" />
      </svg>
    </div>
  );
}

function OrnamentDivider() {
  return (
    <div className="ornament-divider" aria-hidden="true">
      <span />
      <svg viewBox="0 0 26 26">
        <path d="M13 2L24 13L13 24L2 13Z" fill="none" stroke="#bd9648" strokeWidth="1.3" />
        <circle cx="13" cy="13" r="3" fill="#cf6f81" />
      </svg>
      <span />
    </div>
  );
}

function VenuePin() {
  return (
    <svg className="venue-pin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 22C7 16 4 12.5 4 9a8 8 0 0 1 16 0c0 3.5-3 7-8 13Z" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="9" r="2.4" fill="currentColor" />
    </svg>
  );
}

const menuItems = [
  { href: "#top", label: "Home" },
  { href: "#events", label: "Events" },
  { href: "#venue", label: "Venue & RSVP" },
  { href: "#itinerary", label: "Itinerary" },
];

const emptyRsvp = {
  id: "",
  name: "",
  phone: "",
  email: "",
  guestCount: "1",
  events: {
    reception: true,
    wedding: true,
  },
};

const eventMatchesInvite = (event, invite) => {
  if (!invite) {
    return true;
  }

  if (event.id === "reception") {
    return invite.invitedEvents.reception;
  }

  if (event.id === "wedding") {
    return invite.invitedEvents.wedding;
  }

  return true;
};

function RsvpCard({ invite }) {
  const [form, setForm] = useState(emptyRsvp);
  const [savedRsvp, setSavedRsvp] = useState(null);
  const [isEditing, setIsEditing] = useState(true);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const storageKey = invite ? `weddingRsvpId:${invite.inviteCode}` : "weddingRsvpId";
  const invitedRsvpEvents = weddingData.rsvpEvents.filter((event) => eventMatchesInvite(event, invite));

  useEffect(() => {
    if (!invite) {
      return undefined;
    }

    setForm({
      ...emptyRsvp,
      name: invite.guestName || "",
      events: {
        reception: invite.invitedEvents.reception,
        wedding: invite.invitedEvents.wedding,
      },
    });

    const savedId = window.localStorage.getItem(storageKey);

    if (!savedId) {
      return undefined;
    }

    let isMounted = true;
    setStatus("loading");

    fetch(`/api/rsvp?inviteCode=${encodeURIComponent(invite.inviteCode)}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Unable to load saved RSVP.");
        }

        return response.json();
      })
      .then(({ rsvp }) => {
        if (!isMounted) {
          return;
        }

        setSavedRsvp(rsvp);
        setForm({ ...rsvp, guestCount: String(rsvp.guestCount) });
        setIsEditing(false);
        setStatus("idle");
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        window.localStorage.removeItem(storageKey);
        setStatus("idle");
      });

    return () => {
      isMounted = false;
    };
  }, [invite?.inviteCode]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateEvent = (eventId) => {
    setForm((current) => ({
      ...current,
      events: {
        ...current.events,
        [eventId]: !current.events[eventId],
      },
    }));
  };

  const saveRsvp = async (event) => {
    event.preventDefault();
    setStatus("saving");
    setMessage("");

    try {
      const response = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          inviteCode: invite?.inviteCode,
          guestCount: Number.parseInt(form.guestCount, 10),
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to save RSVP.");
      }

      window.localStorage.setItem(storageKey, payload.rsvp.id);
      setSavedRsvp(payload.rsvp);
      setForm({ ...payload.rsvp, guestCount: String(payload.rsvp.guestCount) });
      setIsEditing(false);
      setStatus("idle");
      setMessage("Thank you! We've received your RSVP and can't wait to celebrate with you.");
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Unable to save RSVP. Please try again.");
    }
  };

  if (status === "loading") {
    return (
      <div className="rsvp-card">
        <p className="rsvp-card__eyebrow">RSVP</p>
        <h3>Checking your saved RSVP...</h3>
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="rsvp-card rsvp-card--saved">
        <p className="rsvp-card__eyebrow">RSVP</p>
        <h3>Personalized RSVP</h3>
        <p className="rsvp-card__intro">Please use the invite link shared by our families to RSVP.</p>
      </div>
    );
  }

  if (savedRsvp && !isEditing) {
    return (
      <div className="rsvp-card rsvp-card--saved">
        <p className="rsvp-card__eyebrow">RSVP saved</p>
        <h3>Thank you for RSVPing!</h3>
        <dl className="rsvp-summary">
          <div><dt>Name</dt><dd>{savedRsvp.name}</dd></div>
          <div><dt>Guests</dt><dd>{savedRsvp.guestCount}</dd></div>
          {invitedRsvpEvents.map((rsvpEvent) => (
            <div key={rsvpEvent.id}>
              <dt>{rsvpEvent.title}</dt>
              <dd>{savedRsvp.events[rsvpEvent.id] ? "Attending" : "Not attending"}</dd>
            </div>
          ))}
        </dl>
        <button className="button button--ghost" type="button" onClick={() => setIsEditing(true)}>
          Edit RSVP
        </button>
        {message && <p className="rsvp-card__message">{message}</p>}
      </div>
    );
  }

  return (
    <form className="rsvp-card" onSubmit={saveRsvp}>
      <p className="rsvp-card__eyebrow">RSVP</p>
      <h3>Will you be joining us?</h3>
      <p className="rsvp-card__intro">Please let us know which celebrations you will attend.</p>

      <label className="rsvp-field">
        <span>Name</span>
        <input value={form.name} onChange={(event) => updateField("name", event.target.value)} required />
      </label>

      <label className="rsvp-field">
        <span>Number of guests</span>
        <input type="number" min="1" max="20" value={form.guestCount} onChange={(event) => updateField("guestCount", event.target.value)} required />
      </label>

      <fieldset className="rsvp-events">
        <legend>Events attending</legend>
        {invitedRsvpEvents.map((rsvpEvent) => (
          <label className="rsvp-event" key={rsvpEvent.id}>
            <input type="checkbox" checked={form.events[rsvpEvent.id]} onChange={() => updateEvent(rsvpEvent.id)} />
            <span>
              <strong>{rsvpEvent.title}</strong>
              <small>{rsvpEvent.date} · {rsvpEvent.time}</small>
            </span>
          </label>
        ))}
      </fieldset>

      <button className="button" type="submit" disabled={status === "saving"}>
        {status === "saving" ? "Saving..." : "Submit RSVP"}
      </button>
      {message && <p className={`rsvp-card__message${status === "error" ? " rsvp-card__message--error" : ""}`}>{message}</p>}
    </form>
  );
}

function AdminPortal({ requireSuper = false } = {}) {
  const importInputRef = useRef(null);
  const [credentials, setCredentials] = useState({ username: "", password: "" });
  const [token, setToken] = useState(() => window.localStorage.getItem("weddingAdminToken") || "");
  const [account, setAccount] = useState(() => {
    const saved = window.localStorage.getItem("weddingAdminAccount");
    return saved ? JSON.parse(saved) : null;
  });
  const hasRequiredScope = !requireSuper || account?.family === "all";
  const [status, setStatus] = useState(token && hasRequiredScope ? "loading" : "idle");
  const [message, setMessage] = useState(() => (
    token && !hasRequiredScope ? "Super view requires the all-family developer account." : ""
  ));
  const [dashboard, setDashboard] = useState(null);
  const [invitees, setInvitees] = useState([]);
  const [inviteeForm, setInviteeForm] = useState({
    name: "",
    phone: "",
    email: "",
    hostFamily: "santhosh",
    eventMode: "both",
    notes: "",
  });

  const logout = () => {
    window.localStorage.removeItem("weddingAdminToken");
    window.localStorage.removeItem("weddingAdminAccount");
    setToken("");
    setAccount(null);
    setDashboard(null);
    setInvitees([]);
    setStatus("idle");
  };

  const loadDashboard = async (adminToken = token) => {
    if (!adminToken) {
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const [rsvpResponse, inviteeResponse] = await Promise.all([
        fetch("/api/admin/rsvps", {
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
        fetch("/api/admin/invitees", {
          headers: { Authorization: `Bearer ${adminToken}` },
        }),
      ]);

      const rsvpPayload = await rsvpResponse.json();
      const inviteePayload = await inviteeResponse.json();

      if (!rsvpResponse.ok || !inviteeResponse.ok) {
        if (rsvpResponse.status === 401 || inviteeResponse.status === 401) {
          logout();
        }

        throw new Error(rsvpPayload.error || inviteePayload.error || "Unable to load admin data.");
      }

      setDashboard(rsvpPayload);
      setInvitees(inviteePayload.invitees);
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Unable to load admin data.");
    }
  };

  useEffect(() => {
    if (token && hasRequiredScope) {
      loadDashboard(token);
    }
  }, [token, hasRequiredScope]);

  useEffect(() => {
    if (token && !hasRequiredScope) {
      setStatus("idle");
      setMessage("Super view requires the all-family developer account.");
    }
  }, [token, hasRequiredScope]);

  useEffect(() => {
    if (account?.family && account.family !== "all") {
      setInviteeForm((current) => ({ ...current, hostFamily: account.family }));
    }
  }, [account?.family]);

  const authedFetch = (url, options = {}) =>
    fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });

  const login = async (event) => {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to sign in.");
      }

      if (requireSuper && payload.account?.family !== "all") {
        throw new Error("Please sign in with the all-family developer account for /super.");
      }

      window.localStorage.setItem("weddingAdminToken", payload.token);
      window.localStorage.setItem("weddingAdminAccount", JSON.stringify(payload.account));
      setAccount(payload.account);
      setToken(payload.token);
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Unable to sign in.");
    }
  };

  const formatDate = (value) => value ? new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value)) : "Not available";

  const inviteUrl = (invitee) => `${window.location.origin}/?invite=${invitee.inviteCode}#rsvp`;

  const inviteMessage = (invitee) => [
    `Dear ${invitee.name},`,
    "",
    "With full hearts, our families invite you to be part of Santhosh and Rithikha's wedding celebrations.",
    "Your presence and blessings would mean so much to us as we begin this new chapter together.",
    "",
    "Please view your invitation and share your RSVP here:",
    inviteUrl(invitee),
  ].join("\n");

  const whatsappPhone = (phone) => String(phone || "").replace(/[^0-9]/g, "");

  const whatsappUrl = (invitee) => {
    const phone = whatsappPhone(invitee.phone);

    if (!phone) {
      return "";
    }

    return `https://wa.me/${phone}?text=${encodeURIComponent(inviteMessage(invitee))}`;
  };

  const copyToClipboard = async (text, successMessage) => {
    await navigator.clipboard.writeText(text);
    setMessage(successMessage);
  };

  const accountFamily = account?.family === "all" ? inviteeForm.hostFamily : account?.family || inviteeForm.hostFamily;

  const normalizeEventMode = (value) => {
    const normalized = String(value || "both").trim().toLowerCase();

    if (["reception", "reception only"].includes(normalized)) {
      return "reception";
    }

    if (["wedding", "muhurtham", "wedding only", "muhurtham only"].includes(normalized)) {
      return "wedding";
    }

    return "both";
  };

  const normalizeHostFamily = (value) => {
    if (account?.family && account.family !== "all") {
      return account.family;
    }

    const normalized = String(value || accountFamily).trim().toLowerCase();

    return normalized === "rithikha" ? "rithikha" : "santhosh";
  };

  const valueFromRow = (row, keys) => {
    const entries = Object.entries(row).reduce((accumulator, [key, value]) => {
      accumulator[key.toLowerCase().replace(/[^a-z0-9]/g, "")] = value;
      return accumulator;
    }, {});

    return keys.map((key) => entries[key]).find((value) => String(value || "").trim()) || "";
  };

  const normalizeImportedInvitee = (row) => ({
    name: String(valueFromRow(row, ["guestname", "name", "inviteename"]) || "").trim(),
    phone: String(valueFromRow(row, ["phone", "phonenumber", "mobile", "mobilenumber"]) || "").trim(),
    email: String(valueFromRow(row, ["email", "emailaddress"]) || "").trim(),
    eventMode: normalizeEventMode(valueFromRow(row, ["inviteevents", "events", "event", "rsvpfor"])),
    hostFamily: normalizeHostFamily(valueFromRow(row, ["hostfamily", "family"])),
    notes: String(valueFromRow(row, ["notes", "note"]) || "").trim(),
  });

  const downloadInviteeTemplate = async () => {
    const XLSX = await import("xlsx");
    const rows = [
      {
        "Guest Name": "Example Guest - replace me",
        Phone: "",
        Email: "",
        "Invite Events": "both",
        "Host Family": accountFamily,
        Notes: "Optional",
      },
      {
        "Guest Name": "",
        Phone: "",
        Email: "",
        "Invite Events": "reception",
        "Host Family": accountFamily,
        Notes: "",
      },
    ];
    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet["!cols"] = [
      { wch: 30 },
      { wch: 18 },
      { wch: 28 },
      { wch: 18 },
      { wch: 18 },
      { wch: 30 },
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Invitees");
    XLSX.writeFile(workbook, "wedding-invitee-template.xlsx");
  };

  const createInvitees = async (entries) => {
    setStatus("loading");
    setMessage("");

    try {
      const response = await authedFetch("/api/admin/invitees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitees: entries }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Unable to add invitees.");
      }

      await loadDashboard();
      setStatus("idle");
      return true;
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Unable to add invitees.");
      return false;
    }
  };

  const addInvitee = async (event) => {
    event.preventDefault();
    const didCreate = await createInvitees([inviteeForm]);

    if (didCreate) {
      setInviteeForm((current) => ({
        ...current,
        name: "",
        phone: "",
        email: "",
        notes: "",
      }));
    }
  };

  const importInviteesFromFile = async (event) => {
    const [file] = event.target.files || [];

    if (!file) {
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(buffer, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
      const entries = rows
        .map(normalizeImportedInvitee)
        .filter((entry) => entry.name && !entry.name.toLowerCase().includes("replace me"));

      if (!entries.length) {
        setMessage("No guest names found in the uploaded sheet.");
        return;
      }

      const didCreate = await createInvitees(entries);

      if (didCreate) {
        setMessage(`Imported ${entries.length} invitee${entries.length === 1 ? "" : "s"}.`);
      }
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Unable to read the Excel file.");
    } finally {
      event.target.value = "";
    }
  };

  const deleteInvitee = async (invitee) => {
    if (!window.confirm(`Delete ${invitee.name}? This also removes their RSVP and cannot be undone.`)) {
      return;
    }

    setInvitees((current) => current.filter((item) => item.id !== invitee.id));

    try {
      const response = await authedFetch("/api/admin/invitees", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: invitee.id }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || "Unable to delete invitee.");
      }

      await loadDashboard();
    } catch (error) {
      setMessage(error.message || "Unable to delete invitee.");
      await loadDashboard();
    }
  };

  const deleteRsvp = async (rsvp) => {
    if (!window.confirm(`Delete the RSVP from ${rsvp.name}? This cannot be undone.`)) {
      return;
    }

    setDashboard((current) => current && {
      ...current,
      rsvps: current.rsvps.filter((item) => item.id !== rsvp.id),
    });

    try {
      const response = await authedFetch("/api/admin/rsvps", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rsvp.id }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || "Unable to delete RSVP.");
      }

      await loadDashboard();
    } catch (error) {
      setMessage(error.message || "Unable to delete RSVP.");
      await loadDashboard();
    }
  };

  const toggleInviteSent = async (invitee) => {
    setInvitees((current) => current.map((item) => (
      item.id === invitee.id ? { ...item, inviteSent: !item.inviteSent } : item
    )));

    try {
      const response = await authedFetch("/api/admin/invitees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: invitee.id, inviteSent: !invitee.inviteSent }),
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || "Unable to update invite status.");
      }
    } catch (error) {
      setMessage(error.message || "Unable to update invite status.");
      setInvitees((current) => current.map((item) => (
        item.id === invitee.id ? { ...item, inviteSent: invitee.inviteSent } : item
      )));
    }
  };

  const openWhatsAppInvite = async (invitee) => {
    const url = whatsappUrl(invitee);

    if (!url) {
      setMessage("Add a phone number with country code before opening WhatsApp.");
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");

    if (!invitee.inviteSent) {
      await toggleInviteSent(invitee);
    }
  };

  if (!token || !hasRequiredScope) {
    return (
      <main className="admin-page">
        <section className="admin-login">
          <p className="admin-eyebrow">Private admin</p>
          <h1>{requireSuper ? "Super Dashboard" : "RSVP Dashboard"}</h1>
          <p>{requireSuper ? "Sign in with the all-family developer account to view everything." : "Sign in to view guest responses and event totals."}</p>
          <form className="admin-card" onSubmit={login}>
            <label className="rsvp-field">
              <span>Username</span>
              <input value={credentials.username} onChange={(event) => setCredentials((current) => ({ ...current, username: event.target.value }))} required />
            </label>
            <label className="rsvp-field">
              <span>Password</span>
              <input type="password" value={credentials.password} onChange={(event) => setCredentials((current) => ({ ...current, password: event.target.value }))} required />
            </label>
            <button className="button" type="submit" disabled={status === "loading"}>
              {status === "loading" ? "Signing in..." : "Sign in"}
            </button>
            {message && <p className="admin-message">{message}</p>}
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <section className="admin-shell">
        <header className="admin-header">
          <div>
            <p className="admin-eyebrow">Private admin</p>
            <h1>{requireSuper ? "Super Dashboard" : "RSVP Dashboard"}</h1>
            <p>{requireSuper ? "Developer view across both families, invitees, and RSVP responses." : "Track invitees, RSVP responses, and family-specific invite links."}</p>
            {account && <p className="admin-scope">Signed in as {account.username} · {account.family === "all" ? "All families" : `${account.family} family`}</p>}
          </div>
          <div className="admin-actions">
            <button className="button button--ghost" type="button" onClick={() => loadDashboard()} disabled={status === "loading"}>Refresh</button>
            <button className="button" type="button" onClick={logout}>Logout</button>
          </div>
        </header>

        {message && <p className="admin-message">{message}</p>}

        <div className="admin-stats">
          <article><span>Invitees</span><strong>{invitees.length}</strong></article>
          <article><span>Invited</span><strong>{invitees.filter((invitee) => invitee.inviteSent).length}</strong></article>
          <article><span>Total RSVPs</span><strong>{dashboard?.summary.totalRsvps ?? 0}</strong></article>
          <article><span>Total Guests</span><strong>{dashboard?.summary.totalGuests ?? 0}</strong></article>
          <article><span>Reception</span><strong>{dashboard?.summary.receptionGuests ?? 0}</strong></article>
          <article><span>Wedding</span><strong>{dashboard?.summary.weddingGuests ?? 0}</strong></article>
        </div>

        <div className="admin-table-card admin-form-card">
          <div className="admin-table-header">
            <h2>Add invitees</h2>
            <span>Manual entry or Excel import</span>
          </div>
          <div className="admin-entry-grid">
            <form className="admin-entry-panel admin-invitee-form" onSubmit={addInvitee}>
              <div>
                <p className="admin-panel-kicker">Quick add</p>
                <h3>One household or guest</h3>
                <p className="admin-panel-copy">Use this when you just need to add one invite link quickly.</p>
              </div>
              <label className="rsvp-field admin-form-wide">
                <span>Guest name</span>
                <input value={inviteeForm.name} onChange={(event) => setInviteeForm((current) => ({ ...current, name: event.target.value }))} placeholder="Required" required />
              </label>
              <label className="rsvp-field">
                <span>Phone</span>
                <input value={inviteeForm.phone} onChange={(event) => setInviteeForm((current) => ({ ...current, phone: event.target.value }))} placeholder="Optional" />
              </label>
              <label className="rsvp-field">
                <span>Email</span>
                <input type="email" value={inviteeForm.email} onChange={(event) => setInviteeForm((current) => ({ ...current, email: event.target.value }))} placeholder="Optional" />
              </label>
              <label className="rsvp-field">
                <span>Family</span>
                <select value={inviteeForm.hostFamily} disabled={account?.family !== "all"} onChange={(event) => setInviteeForm((current) => ({ ...current, hostFamily: event.target.value }))}>
                  <option value="santhosh">Santhosh</option>
                  <option value="rithikha">Rithikha</option>
                </select>
              </label>
              <label className="rsvp-field">
                <span>Invite events</span>
                <select value={inviteeForm.eventMode} onChange={(event) => setInviteeForm((current) => ({ ...current, eventMode: event.target.value }))}>
                  <option value="both">Reception + Wedding</option>
                  <option value="reception">Reception only</option>
                  <option value="wedding">Wedding only</option>
                </select>
              </label>
              <label className="rsvp-field admin-form-wide">
                <span>Notes</span>
                <input value={inviteeForm.notes} onChange={(event) => setInviteeForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Optional" />
              </label>
              <button className="button" type="submit" disabled={status === "loading"}>Add invitee</button>
            </form>

            <aside className="admin-entry-panel admin-import-panel">
              <div>
                <p className="admin-panel-kicker">Excel import</p>
                <h3>Upload a guest sheet</h3>
                <p className="admin-panel-copy">Download the template, fill only the names if that is all you have, then upload it back here.</p>
              </div>
              <div className="admin-import-steps">
                <span>Required: Guest Name</span>
                <span>Optional: Phone, Email, Notes</span>
                <span>Events: both, reception, or wedding</span>
              </div>
              <div className="admin-import-actions">
                <button className="button button--ghost" type="button" onClick={downloadInviteeTemplate}>Download template</button>
                <button className="button" type="button" onClick={() => importInputRef.current?.click()} disabled={status === "loading"}>Upload Excel</button>
                <input ref={importInputRef} className="admin-file-input" type="file" accept=".xlsx,.xls,.csv" onChange={importInviteesFromFile} />
              </div>
            </aside>
          </div>
        </div>

        <div className="admin-table-card">
          <div className="admin-table-header">
            <h2>Invitee list</h2>
            <span>{status === "loading" ? "Loading..." : `${invitees.length} records`}</span>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Invited</th>
                  <th>Responded</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Reception</th>
                  <th>Wedding</th>
                  <th>Family</th>
                  <th>Send invite</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {invitees.length ? invitees.map((invitee) => (
                  <tr key={invitee.id}>
                    <td><input type="checkbox" checked={invitee.inviteSent} onChange={() => toggleInviteSent(invitee)} /></td>
                    <td>{invitee.responded ? "Yes" : "No"}</td>
                    <td>{invitee.name}</td>
                    <td>{invitee.phone || "-"}</td>
                    <td>{invitee.email || "-"}</td>
                    <td>{invitee.invitedEvents.reception ? "Yes" : "No"}</td>
                    <td>{invitee.invitedEvents.wedding ? "Yes" : "No"}</td>
                    <td>{invitee.hostFamily}</td>
                    <td>
                      <div className="admin-send-actions">
                        <button className="admin-link-button" type="button" onClick={() => copyToClipboard(inviteUrl(invitee), `Copied invite link for ${invitee.name}.`)}>Copy link</button>
                        <button className="admin-link-button" type="button" onClick={() => copyToClipboard(inviteMessage(invitee), `Copied WhatsApp message for ${invitee.name}.`)}>Copy message</button>
                        <button className="admin-link-button admin-link-button--whatsapp" type="button" disabled={!whatsappPhone(invitee.phone)} onClick={() => openWhatsAppInvite(invitee)}>WhatsApp</button>
                      </div>
                    </td>
                    <td><button className="admin-link-button admin-link-button--danger" type="button" onClick={() => deleteInvitee(invitee)}>Delete</button></td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="10">No invitees yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="admin-table-card">
          <div className="admin-table-header">
            <h2>RSVP responses</h2>
            <span>{status === "loading" ? "Loading..." : `${dashboard?.rsvps.length ?? 0} records`}</span>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Guests</th>
                  <th>Reception</th>
                  <th>Wedding</th>
                  <th>Updated</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {dashboard?.rsvps.length ? dashboard.rsvps.map((rsvp) => (
                  <tr key={rsvp.id}>
                    <td>{rsvp.name}</td>
                    <td>{rsvp.phone}</td>
                    <td>{rsvp.email || "-"}</td>
                    <td>{rsvp.guestCount}</td>
                    <td>{rsvp.events.reception ? "Yes" : "No"}</td>
                    <td>{rsvp.events.wedding ? "Yes" : "No"}</td>
                    <td>{formatDate(rsvp.updatedAt)}</td>
                    <td><button className="admin-link-button admin-link-button--danger" type="button" onClick={() => deleteRsvp(rsvp)}>Delete</button></td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="8">No RSVPs yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}

function FloatingMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const updateMode = () => {
      const isNarrow = window.matchMedia("(max-width: 640px)").matches;
      setIsCompact(window.scrollY > 90 || isNarrow);
    };

    updateMode();
    window.addEventListener("scroll", updateMode, { passive: true });
    window.addEventListener("resize", updateMode);

    return () => {
      window.removeEventListener("scroll", updateMode);
      window.removeEventListener("resize", updateMode);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  return (
    <nav className={`top-menu${isCompact ? " top-menu--compact" : ""}${isOpen ? " top-menu--open" : ""}`} aria-label="Wedding invite navigation">
      <div className="top-menu__panel" id="floating-menu-links" aria-hidden={isCompact && !isOpen}>
        {menuItems.map((item) => (
          <a href={item.href} key={item.href} tabIndex={!isCompact || isOpen ? 0 : -1} onClick={() => setIsOpen(false)}>{item.label}</a>
        ))}
      </div>
      <button
        className="top-menu__button"
        type="button"
        aria-expanded={isOpen}
        aria-controls="floating-menu-links"
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>{isOpen ? "Close" : "Menu"}</span>
      </button>
    </nav>
  );
}

function App() {
  const countdown = useCountdown(weddingData.weddingStart);
  const petalCanvasRef = useRef(null);
  const heroImageRef = useRef(null);
  const [invite, setInvite] = useState(null);
  const [inviteStatus, setInviteStatus] = useState("idle");

  usePetals(petalCanvasRef);
  useRevealOnScroll();

  useEffect(() => {
    const updateParallax = () => {
      const image = heroImageRef.current;
      if (image && window.scrollY < 1000) {
        image.style.setProperty("--hero-parallax", `${window.scrollY * 0.16}px`);
      }
    };

    window.addEventListener("scroll", updateParallax, { passive: true });
    return () => window.removeEventListener("scroll", updateParallax);
  }, []);

  useEffect(() => {
    const hash = window.location.hash;

    if (!hash) {
      return undefined;
    }

    const target = document.getElementById(hash.slice(1));

    if (!target) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const inviteCode = new URLSearchParams(window.location.search).get("invite");

    if (!inviteCode) {
      return undefined;
    }

    let isMounted = true;
    setInviteStatus("loading");

    fetch(`/api/invite?code=${encodeURIComponent(inviteCode)}`)
      .then(async (response) => {
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || "Unable to load invite.");
        }

        return payload.invite;
      })
      .then((loadedInvite) => {
        if (!isMounted) {
          return;
        }

        setInvite(loadedInvite);
        setInviteStatus("idle");
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setInviteStatus("error");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (window.location.pathname === "/admin") {
    return <AdminPortal />;
  }

  if (window.location.pathname === "/super") {
    return <AdminPortal requireSuper />;
  }

  const isRithikhaInvite = invite?.hostFamily === "rithikha";
  const couple = isRithikhaInvite ? [...weddingData.couple].reverse() : weddingData.couple;
  const families = isRithikhaInvite ? [...weddingData.families].reverse() : weddingData.families;
  const keyEvents = weddingData.keyEvents.filter((event) => {
    if (!invite) {
      return true;
    }

    return event.id === "reception" ? invite.invitedEvents.reception : invite.invitedEvents.wedding;
  });
  const showFullWeddingGuide = !invite || (invite.invitedEvents.reception && invite.invitedEvents.wedding);

  return (
    <div className="invite-page">
      <FloatingMenu />
      <section className="hero" id="top">
        <picture className="hero__picture" aria-hidden="true">
          <img ref={heroImageRef} className="hero__temple" src="/hero-wedding-floral-v4.png" alt="" />
        </picture>
        <div className="hero__wash" />
        <div className="hero__glow" />
        <canvas className="hero__petals" ref={petalCanvasRef} aria-hidden="true" />
        {weddingData.showKolamHalo && <KolamHalo />}
        <div className="hero__legibility" />

        <div className="hero__content">
          <p className="hero__ganesha">ॐ श्री गणेशाय नमः</p>
          <p className="hero__overline">
            {weddingData.heroLabel.map((line) => <span key={line}>{line}</span>)}
          </p>
          <h1>
            <span>{couple[0]}</span>
            <em>&amp;</em>
            <span>{couple[1]}</span>
          </h1>
          <p className="hero__tamil">இரு குடும்பங்களின் வாழ்த்துகளுடன்</p>
          <div className="hero__date">
            <span />
            <b>{weddingData.weddingDate}</b>
            <span />
          </div>
          <div className="countdown" aria-live="polite">
            <div><strong>{countdown.days}</strong><span>Days</span></div>
            <div><strong>{countdown.hours}</strong><span>Hours</span></div>
            <div><strong>{countdown.minutes}</strong><span>Minutes</span></div>
          </div>
          <a className="scroll-invite" href="#events">
            <span>Key events</span>
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 6 5 5 5-5" /></svg>
          </a>
        </div>
      </section>

      <main>
        <section className="section key-events" id="events">
          <div className="section__narrow" data-reveal>
            <p className="eyebrow">Join us for</p>
            <div className={`key-events__list${keyEvents.length === 1 ? " key-events__list--single" : ""}`}>
              {keyEvents.map((event) => (
                <article className="key-event" key={event.title}>
                  <h2>{event.title}</h2>
                  <p>{event.date}</p>
                  <span>{event.time}</span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section invitation" id="invitation">
          <div className="section__narrow" data-reveal>
            <OrnamentDivider />
            <p className="invitation__sanskrit">{weddingData.invitation.sanskrit}</p>
            <p className="invitation__transliteration">{weddingData.invitation.transliteration}</p>
            <p className="invitation__quote">“{weddingData.invitation.blessing}”</p>
            <p className="invitation__message">{weddingData.invitation.message}</p>
            <div className="family-tags">
              {families.map((family) => <span key={family}>{family}</span>)}
            </div>
          </div>
        </section>

        <section className="section venue" id="venue">
          <div className="section__narrow" data-reveal>
            <OrnamentDivider />
            <p className="eyebrow">The venue</p>
            <h2>Where we will gather</h2>
            <div className="venue-card">
              <p className="venue-card__eyebrow">Ceremony & Reception</p>
              <h3>{weddingData.venue.name}</h3>
              <p>{weddingData.venue.description}</p>
              <a className="button" href={weddingData.venue.directionsHref}><VenuePin />Get directions</a>
            </div>
            {inviteStatus === "error" && <p className="rsvp-card__message rsvp-card__message--error">This invite link could not be found. Please check the link shared with you.</p>}
            <div id="rsvp">
              <RsvpCard invite={invite} />
            </div>
          </div>
        </section>

        {showFullWeddingGuide && <section className="section itinerary" id="itinerary">
          <div className="section__wide">
            <div className="section-heading" data-reveal>
              <p className="eyebrow">The celebration</p>
              <h2>Two days of rituals & joy</h2>
            </div>
            <div className="itinerary__days">
              {weddingData.days.map((day) => (
                <article className="itinerary-day" data-reveal key={day.date}>
                  <header>
                    <b>{day.date}</b>
                    <div><h3>{day.title}</h3><p>{day.subtitle}</p></div>
                  </header>
                  <div className="itinerary-day__events">
                    {day.events.map((event) => (
                      <div className="timeline-event" key={event.title}>
                        <span className="timeline-event__dot" />
                        <p className="timeline-event__time">{event.time}</p>
                        <h4>{event.title}</h4>
                        <p>{event.description}</p>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>}

        {weddingData.showCoupleSection && (
          <section className="section story" id="story">
            <div className="section__wide">
              <div className="section-heading" data-reveal>
                <p className="eyebrow">Meet the couple</p>
                <h2>Two cities, one story, a weekend of blessings</h2>
                <p>Rooted in tradition and connected across the places we call home - Bombay, Chennai, and the Bay Area - this celebration brings together heritage, laughter, and the people we love most.</p>
              </div>
              <div className="people-grid">
                {weddingData.people.map((person, index) => (
                  <article className={`person-card person-card--${index}`} data-reveal key={person.name}>
                    <div className="person-card__image"><span>{person.imageLabel}</span></div>
                    <div className="person-card__body">
                      <p className="eyebrow">{person.role}</p>
                      <h3>{person.name}</h3>
                      <p className="person-card__location">{person.location}</p>
                      <p>{person.description}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="section closing">
          <div className="section__narrow" data-reveal>
            <OrnamentDivider />
            <p className="eyebrow">With love & gratitude</p>
            <h2>We look forward to<br />celebrating with you</h2>
            <p>Your presence is the greatest blessing of all. We can’t wait to share these sacred days, and a lifetime of joy, with the people we hold dearest.</p>
            <p className="closing__names">Santhosh & Rithikha</p>
            <p className="closing__tamil">நன்றி · வாழ்க வளமுடன்</p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
