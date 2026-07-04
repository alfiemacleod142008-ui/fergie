"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  ArrowRight,
  ChevronRight,
  FolderPlus,
  Loader2,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  Settings,
  SquarePen,
  Trash2,
  Wheat,
} from "lucide-react";

import { Landing } from "@/components/landing";
import { GridBackground } from "@/components/grid-background";
import { FieldPanel } from "@/components/field-panel";
import { FieldLoading } from "@/components/field-loading";
import { Markdown } from "@/components/markdown";
import { Modal } from "@/components/modal";
import { ChatInput, ChatInputSubmit, ChatInputTextArea } from "@/components/ui/chat-input";

const FieldMap = dynamic(() => import("@/components/field-map").then((m) => m.FieldMap), {
  ssr: false,
  loading: () => <div className="h-72 w-full animate-pulse bg-white/[0.06]" />,
});

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const FOCUS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black";
const PRIMARY = `group flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-8 py-3.5 font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:bg-primary/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none ${FOCUS}`;
const INPUT = `w-full rounded-lg border border-white/15 bg-white/[0.04] px-4 py-3 text-[15px] text-white outline-none transition placeholder:text-white/50 focus:border-emerald-400/60 focus:ring-4 focus:ring-emerald-400/10`;

type Msg =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string }
  | { role: "image"; url: string; builtUp?: boolean }
  | { role: "advice"; crop: string; advice: any; land: any; summary: string | null };

function wantsField(text: string) {
  const t = text.toLowerCase();
  if (/\b(satellite|aerial|birds?[\s-]?eye|from above|overhead)\b/.test(t)) return true;
  if (/\b(show|see|view|pull up|display|look at|image|picture|photo|map)\b/.test(t) && /\b(field|farm|land|plot|property|garden)\b/.test(t)) return true;
  return false;
}

function mightHaveFacts(text: string) {
  const t = text.toLowerCase();
  if (t.trim().length < 12) return false;
  return (
    /\bmy\b|\bour\b/.test(t) ||
    /\b(soil|clay|sandy|loam|chalky|peaty|organic|greenhouse|polytunnel|allotment|raised bed|no dig|borehole|acre|hectare)\b/.test(t)
  );
}

function liteAdvice(advice: any) {
  if (!advice?.data) return advice;
  return { ...advice, data: { soil: advice.data.soil } };
}
type Coords = { lat: number; lon: number };
type Result = { advice: any; land: any; summary: string | null };
type Chat = {
  id: string;
  geo: any;
  pin: Coords | null;
  pinned: boolean;
  results: Record<string, Result>;
  order: string[];
  activeCrop: string;
  messages: Msg[];
  folderId?: string | null;
  title?: string;
};
type Folder = { id: string; name: string; collapsed?: boolean };

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function makeChat(base?: { geo: any; pin: Coords | null }): Chat {
  return {
    id: uid(),
    geo: base?.geo ?? null,
    pin: base?.pin ?? null,
    pinned: Boolean(base),
    results: {},
    order: [],
    activeCrop: "",
    messages: [],
    folderId: null,
  };
}

function chatTitle(chat: Chat) {
  if (chat.title) return chat.title;
  if (chat.order.length) return chat.order[0];
  const firstUser = chat.messages.find((m) => m.role === "user") as { content: string } | undefined;
  if (firstUser) return firstUser.content;
  return "New chat";
}

type FieldProps = {
  icon: typeof MapPin;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onEnter: () => void;
  placeholder: string;
};

function Field({ icon: Icon, label, value, onChange, onEnter, placeholder }: FieldProps) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-white/15 bg-white/[0.04] px-4 py-3.5 text-left transition focus-within:border-emerald-400/60 focus-within:bg-white/[0.07] focus-within:ring-4 focus-within:ring-emerald-400/15">
      <Icon className="size-[18px] shrink-0 text-white/55" aria-hidden="true" />
      <input
        aria-label={label}
        autoComplete="off"
        maxLength={60}
        className="w-full bg-transparent text-[15px] text-white outline-none placeholder:text-white/55"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => event.key === "Enter" && onEnter()}
      />
    </div>
  );
}

export default function Home() {
  const [booted, setBooted] = useState(false);
  const [started, setStarted] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentId, setCurrentId] = useState("");
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [renaming, setRenaming] = useState("");
  const [renameText, setRenameText] = useState("");
  const [memory, setMemory] = useState<string[]>([]);
  const [postcode, setPostcode] = useState("");
  const [crop, setCrop] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [showCrop, setShowCrop] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [modalCrop, setModalCrop] = useState("");
  const [settingsPostcode, setSettingsPostcode] = useState("");
  const reqId = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("fergie-chats");
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved?.chats?.length) {
          setChats(saved.chats);
          setFolders(saved.folders || []);
          setMemory(saved.memory || []);
          setCurrentId(saved.currentId || saved.chats[0].id);
          setStarted(true);
        }
      }
    } catch {}
    setBooted(true);
  }, []);

  useEffect(() => {
    if (!started || !chats.length) return;
    try {
      const slim = chats.map((c) => ({
        ...c,
        results: Object.fromEntries(
          Object.entries(c.results).map(([k, r]) => [k, { ...r, advice: liteAdvice(r.advice) }]),
        ),
        messages: c.messages.map((m) => (m.role === "advice" ? { ...m, advice: liteAdvice(m.advice) } : m)),
      }));
      localStorage.setItem("fergie-chats", JSON.stringify({ chats: slim, folders, memory, currentId }));
    } catch {}
  }, [started, chats, folders, memory, currentId]);

  const current = chats.find((c) => c.id === currentId) || null;
  const geo = current?.geo ?? null;
  const pin = current?.pin ?? null;
  const results = current?.results ?? {};
  const order = current?.order ?? [];
  const activeCrop = current?.activeCrop ?? "";
  const messages = current?.messages ?? [];

  function patch(fn: (chat: Chat) => Partial<Chat>) {
    setChats((cs) => cs.map((c) => (c.id === currentId ? { ...c, ...fn(c) } : c)));
  }

  function scrollDown() {
    requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }));
  }

  async function geocode(pc: string) {
    const response = await fetch(`${API}/geocode?location=${encodeURIComponent(pc.trim())}`);
    const data = await response.json();
    if (data.error) {
      setError(data.error);
      return null;
    }
    return data;
  }

  async function resolveText(text: string) {
    try {
      const response = await fetch(`${API}/resolve?text=${encodeURIComponent(text)}&local=true`);
      const data = await response.json();
      return (data.crop as string | null) || null;
    } catch {
      return null;
    }
  }

  async function fetchCrop(cropName: string, coords: Coords): Promise<Result | null> {
    const params = new URLSearchParams({
      location: (geo?.name || postcode).trim(),
      crop: cropName,
      lat: String(coords.lat),
      lon: String(coords.lon),
    });
    const response = await fetch(`${API}/advice?${params}`);
    const advice = await response.json();
    if (advice.error) return null;
    const [land, summaryData] = await Promise.all([
      fetch(`${API}/landuse?lat=${coords.lat}&lon=${coords.lon}`)
        .then((r) => r.json())
        .catch(() => null),
      fetch(`${API}/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(advice),
      })
        .then((r) => r.json())
        .catch(() => ({ summary: null })),
    ]);
    return { advice, land, summary: summaryData?.summary ?? null };
  }

  async function chatReply(advice: any, history: Msg[]) {
    const trimmed = history
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: (m as any).content }));
    const response = await fetch(`${API}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ advice, messages: trimmed, memory, lat: pin?.lat, lon: pin?.lon }),
    });
    const data = await response.json();
    return data.reply as string | null;
  }

  function learn(text: string) {
    fetch(`${API}/remember`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: text }] }),
    })
      .then((response) => response.json())
      .then((data) => {
        const facts: string[] = (data.facts || []).filter(Boolean);
        if (!facts.length) return;
        setMemory((prev) => {
          const seen = new Set(prev.map((m) => m.toLowerCase()));
          const merged = [...prev];
          for (const fact of facts) {
            if (!seen.has(fact.toLowerCase())) merged.push(fact);
          }
          return merged.slice(-25);
        });
      })
      .catch(() => {});
  }

  async function locate(pc = postcode) {
    if (!pc.trim() || !crop.trim() || locating) return;
    setLocating(true);
    setError("");
    try {
      const place = await geocode(pc);
      if (place) patch(() => ({ geo: place, pin: { lat: place.latitude, lon: place.longitude }, pinned: false }));
    } catch {
      setError("Couldn't reach the server. Is the backend running?");
    } finally {
      setLocating(false);
    }
  }

  async function start(coords = pin, cr = crop, pc = postcode) {
    if (!coords || !cr.trim() || loading) return;
    const id = ++reqId.current;
    const name = cr.trim().toLowerCase();
    setLoading(true);
    setError("");
    try {
      if (geo?.name !== pc && pc.trim()) {
        const place = await geocode(pc);
        if (place) patch(() => ({ geo: place }));
      }
      const result = await fetchCrop(name, coords);
      if (id !== reqId.current) return;
      if (!result) {
        setError(`I couldn't get advice for "${name}" there. Try another crop or postcode.`);
        return;
      }
      const canonical = (result.advice.crop || name).toLowerCase();
      patch(() => ({
        pinned: true,
        results: { [canonical]: result },
        order: [canonical],
        activeCrop: canonical,
        messages: [{ role: "advice", crop: canonical, ...result }],
      }));
    } catch {
      if (id === reqId.current) setError("Couldn't reach the server. Is the backend running?");
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }

  async function onSend(text: string) {
    if (!pin || sending) return;
    const history: Msg[] = [...messages, { role: "user", content: text }];
    patch(() => ({ messages: history }));
    setSending(true);
    scrollDown();
    if (mightHaveFacts(text) && !wantsField(text)) learn(text);
    try {
      if (wantsField(text)) {
        const data = await fetch(`${API}/field?lat=${pin.lat}&lon=${pin.lon}`)
          .then((r) => r.json())
          .catch(() => null);
        if (data?.image_url) {
          patch((c) => ({
            messages: [...c.messages, { role: "image", url: data.image_url, builtUp: data.plantable === false }],
          }));
        } else {
          patch((c) => ({
            messages: [...c.messages, { role: "assistant", content: "I couldn't load the satellite view just then, try again in a moment." }],
          }));
        }
        return;
      }
      const detected = await resolveText(text);
      if (detected && detected !== activeCrop) {
        const existing = results[detected];
        const result = existing ?? (await fetchCrop(detected, pin));
        if (result) {
          const canonical = (result.advice.crop || detected).toLowerCase();
          patch((c) => ({
            results: { ...c.results, [canonical]: result },
            order: c.order.includes(canonical) ? c.order : [...c.order, canonical],
            activeCrop: canonical,
            messages: [...c.messages, { role: "advice", crop: canonical, ...result }],
          }));
        } else {
          patch((c) => ({ messages: [...c.messages, { role: "assistant", content: `I couldn't get data for "${detected}" just then.` }] }));
        }
      } else {
        const reply = await chatReply(results[activeCrop]?.advice, history);
        patch((c) => ({
          messages: [...c.messages, { role: "assistant", content: reply || "I'm a bit busy right now. Give me a moment and ask again." }],
        }));
      }
    } catch {
      patch((c) => ({ messages: [...c.messages, { role: "assistant", content: "I couldn't reach the server just then, try again?" }] }));
    } finally {
      setSending(false);
      scrollDown();
    }
  }

  function submit() {
    const q = input.trim();
    if (!q || sending) return;
    setInput("");
    onSend(q);
  }

  async function addCrop(text: string) {
    const name = text.trim();
    if (!name || !pin || sending) return;
    setShowCrop(false);
    setModalCrop("");
    setSending(true);
    scrollDown();
    try {
      const result = await fetchCrop(name, pin);
      if (result) {
        const canonical = (result.advice.crop || name).toLowerCase();
        patch((c) => ({
          results: { ...c.results, [canonical]: result },
          order: c.order.includes(canonical) ? c.order : [...c.order, canonical],
          activeCrop: canonical,
          messages: [...c.messages, { role: "advice", crop: canonical, ...result }],
        }));
      } else {
        patch((c) => ({ messages: [...c.messages, { role: "assistant", content: `I couldn't get advice for "${name}".` }] }));
      }
    } catch {
      patch((c) => ({ messages: [...c.messages, { role: "assistant", content: "I couldn't reach the server just then." }] }));
    } finally {
      setSending(false);
      scrollDown();
    }
  }

  function newChat() {
    const chat = pin ? makeChat({ geo, pin }) : makeChat();
    setChats((cs) => [chat, ...cs]);
    setCurrentId(chat.id);
    setInput("");
    setError("");
  }

  function selectChat(id: string) {
    setCurrentId(id);
    setInput("");
    setError("");
  }

  function deleteChat(id: string) {
    setMenu(null);
    setRenaming("");
    const removed = chats.find((c) => c.id === id);
    const next = chats.filter((c) => c.id !== id);
    if (next.length === 0) {
      const fresh = removed?.pin ? makeChat({ geo: removed.geo, pin: removed.pin }) : makeChat();
      setChats([fresh]);
      setCurrentId(fresh.id);
      return;
    }
    setChats(next);
    if (id === currentId) setCurrentId(next[0].id);
  }

  function startRename(id: string) {
    setMenu(null);
    setRenaming(id);
    setRenameText(chatTitle(chats.find((c) => c.id === id) as Chat));
  }

  function commitRename() {
    if (renaming) {
      const text = renameText.trim();
      setChats((cs) => cs.map((c) => (c.id === renaming ? { ...c, title: text || undefined } : c)));
    }
    setRenaming("");
    setRenameText("");
  }

  function moveChat(id: string, folderId: string | null) {
    setMenu(null);
    setChats((cs) => cs.map((c) => (c.id === id ? { ...c, folderId } : c)));
  }

  function newFolder() {
    setFolders((fs) => [...fs, { id: uid(), name: "New folder" }]);
  }

  function renameFolder(id: string, name: string) {
    setFolders((fs) => fs.map((f) => (f.id === id ? { ...f, name: name.trim() || f.name } : f)));
  }

  function deleteFolder(id: string) {
    setFolders((fs) => fs.filter((f) => f.id !== id));
    setChats((cs) => cs.map((c) => (c.folderId === id ? { ...c, folderId: null } : c)));
  }

  function toggleFolder(id: string) {
    setFolders((fs) => fs.map((f) => (f.id === id ? { ...f, collapsed: !f.collapsed } : f)));
  }

  function openMenu(event: React.MouseEvent, id: string) {
    event.stopPropagation();
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setMenu({
      id,
      x: Math.min(rect.left, window.innerWidth - 190),
      y: Math.min(rect.bottom + 4, window.innerHeight - 170),
    });
  }

  function selectCrop(name: string) {
    patch(() => ({ activeCrop: name }));
    document.getElementById(`crop-${name}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function openSettings() {
    setSettingsPostcode(geo?.name || postcode || "");
    setError("");
    setShowSettings(true);
  }

  async function changeLocation(pc: string) {
    const q = pc.trim();
    if (!q) return;
    setError("");
    const place = await geocode(q).catch(() => null);
    if (!place) return;
    setShowSettings(false);
    setPostcode(q);
    patch(() => ({
      geo: place,
      pin: { lat: place.latitude, lon: place.longitude },
      pinned: false,
      results: {},
      order: [],
      activeCrop: "",
      messages: [],
    }));
  }

  function adjustPin() {
    patch(() => ({ pinned: false, results: {}, order: [], activeCrop: "", messages: [] }));
    setError("");
  }

  function changeField() {
    setPostcode("");
    setCrop("");
    setInput("");
    setError("");
    patch(() => ({ geo: null, pin: null, pinned: false, results: {}, order: [], activeCrop: "", messages: [] }));
  }

  function renderChat(chat: Chat) {
    if (renaming === chat.id) {
      return (
        <input
          key={chat.id}
          autoFocus
          value={renameText}
          onChange={(event) => setRenameText(event.target.value)}
          onBlur={commitRename}
          onKeyDown={(event) => {
            if (event.key === "Enter") commitRename();
            if (event.key === "Escape") setRenaming("");
          }}
          className="w-full rounded-lg bg-white/[0.06] px-2 py-2 text-sm text-white outline-none ring-1 ring-emerald-400/50"
        />
      );
    }
    return (
      <div
        key={chat.id}
        className={`group flex items-center rounded-lg ${chat.id === currentId ? "bg-white/10" : "hover:bg-white/[0.05]"}`}
      >
        <button
          onClick={() => selectChat(chat.id)}
          className={`min-w-0 flex-1 truncate px-2 py-2 text-left text-sm capitalize ${chat.id === currentId ? "text-white" : "text-white/70"} ${FOCUS}`}
        >
          {chatTitle(chat)}
        </button>
        <button
          onClick={(event) => openMenu(event, chat.id)}
          aria-label="Chat options"
          className="mr-1 hidden shrink-0 rounded p-1 text-white/50 transition hover:text-white group-hover:block"
        >
          <MoreHorizontal className="size-4" aria-hidden="true" />
        </button>
      </div>
    );
  }

  const place = [geo?.name, geo?.region].filter(Boolean).join(", ");
  const ready = postcode.trim() && crop.trim();
  const phase = loading ? "loading" : !geo ? "input" : !current?.pinned ? "map" : "result";

  if (!booted) {
    return <div className="min-h-dvh bg-black" />;
  }

  if (!started) {
    return (
      <Landing
        onEnter={() => {
          const chat = makeChat();
          setChats([chat]);
          setCurrentId(chat.id);
          setStarted(true);
        }}
      />
    );
  }

  if (phase === "result") {
    return (
      <main className="flex h-dvh overflow-hidden bg-neutral-950 text-white antialiased duration-700 animate-in fade-in motion-reduce:animate-none">
        <aside className="hidden w-64 flex-col border-r border-white/10 bg-black/40 md:flex">
          <div className="flex items-center gap-2 px-4 pb-3 pt-5">
            <span className="size-2.5 rounded-full bg-emerald-400" />
            <span className="text-[15px] font-semibold tracking-tight">Fergie</span>
          </div>
          <div className="px-3">
            <button
              onClick={newChat}
              className={`flex w-full items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/[0.06] ${FOCUS}`}
            >
              <SquarePen className="size-4" aria-hidden="true" /> New chat
            </button>
          </div>
          <div className="mt-5 flex-1 overflow-y-auto px-3">
            <div className="flex items-center justify-between px-2 pb-1">
              <p className="text-xs font-medium text-white/40">Chats</p>
              <button
                onClick={newFolder}
                aria-label="New folder"
                className={`rounded p-0.5 text-white/40 transition hover:text-white ${FOCUS}`}
              >
                <FolderPlus className="size-4" aria-hidden="true" />
              </button>
            </div>
            {folders.map((folder) => (
              <div key={folder.id} className="mb-1">
                <div className="group flex items-center rounded-lg hover:bg-white/[0.04]">
                  <button
                    onClick={() => toggleFolder(folder.id)}
                    onDoubleClick={() => {
                      const name = window.prompt("Folder name", folder.name);
                      if (name !== null) renameFolder(folder.id, name);
                    }}
                    className={`flex min-w-0 flex-1 items-center gap-1 px-1.5 py-1.5 text-left text-xs font-medium text-white/55 ${FOCUS}`}
                  >
                    <ChevronRight
                      className={`size-3.5 shrink-0 transition-transform ${folder.collapsed ? "" : "rotate-90"}`}
                      aria-hidden="true"
                    />
                    <span className="truncate">{folder.name}</span>
                  </button>
                  <button
                    onClick={() => deleteFolder(folder.id)}
                    aria-label="Delete folder"
                    className="mr-1 hidden shrink-0 rounded p-1 text-white/40 transition hover:text-red-300 group-hover:block"
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
                {!folder.collapsed && (
                  <div className="ml-3 border-l border-white/10 pl-1">
                    {chats.filter((c) => c.folderId === folder.id).map(renderChat)}
                  </div>
                )}
              </div>
            ))}
            {chats.filter((c) => !c.folderId).map(renderChat)}
          </div>
          <div className="border-t border-white/10 p-3">
            <button
              onClick={openSettings}
              className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-white/70 transition hover:bg-white/[0.05] hover:text-white ${FOCUS}`}
            >
              <Settings className="size-4" aria-hidden="true" /> Settings
            </button>
            {place && <p className="truncate px-2 pt-2 text-xs text-white/40">{place}</p>}
          </div>
        </aside>

        <div className="flex flex-1 flex-col">
          <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <span className="flex min-w-0 items-center gap-1.5 text-sm text-white/70">
              <MapPin className="size-4 shrink-0 text-emerald-400" aria-hidden="true" />
              <span className="truncate">{place || "New chat"}</span>
            </span>
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={newChat}
                aria-label="New chat"
                className={`grid size-9 place-items-center rounded-full border border-white/10 text-white/70 transition hover:bg-white/10 hover:text-white md:hidden ${FOCUS}`}
              >
                <SquarePen className="size-4" aria-hidden="true" />
              </button>
              <button
                onClick={() => {
                  setModalCrop("");
                  setShowCrop(true);
                }}
                className={`flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-white/80 transition hover:bg-white/10 hover:text-white ${FOCUS}`}
              >
                <Plus className="size-3.5" aria-hidden="true" /> New crop
              </button>
              <button
                onClick={openSettings}
                aria-label="Settings"
                className={`grid size-9 place-items-center rounded-full border border-white/10 text-white/70 transition hover:bg-white/10 hover:text-white ${FOCUS}`}
              >
                <Settings className="size-4" aria-hidden="true" />
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto">
            {messages.length === 0 && !sending ? (
              <div className="flex h-full items-center justify-center px-6 text-center">
                <div className="max-w-sm">
                  <p className="text-xl font-light tracking-tight text-white">What are we growing?</p>
                  <p className="mt-2 text-[15px] font-light leading-relaxed text-white/55">
                    Name a crop for its planting outlook on your field{place ? ` at ${place}` : ""}, or ask
                    me anything about farming and the weather.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-3xl space-y-7 px-4 py-8">
                {messages.map((message, index) => {
                  if (message.role === "user") {
                    return (
                      <div key={index} className="flex justify-end">
                        <div className="max-w-[80%] rounded-2xl bg-white/10 px-4 py-2.5 text-[15px] leading-relaxed text-white">
                          {message.content}
                        </div>
                      </div>
                    );
                  }
                  if (message.role === "assistant") {
                    return (
                      <div key={index}>
                        <Markdown>{message.content}</Markdown>
                      </div>
                    );
                  }
                  if (message.role === "image") {
                    return (
                      <figure key={index} className="max-w-sm overflow-hidden rounded-2xl border border-white/10">
                        <img
                          src={message.url}
                          alt="Satellite view of your field"
                          className="aspect-[4/3] w-full object-cover"
                        />
                        <figcaption className="bg-white/[0.03] px-3 py-2 text-[13px] text-white/60">
                          {message.builtUp
                            ? "Your field from above. This spot looks built up, re-pin in Settings if needed."
                            : "Your field from above."}
                        </figcaption>
                      </figure>
                    );
                  }
                  return (
                    <div key={index} id={`crop-${message.crop}`} className="space-y-3">
                      {message.summary && (
                        <p className="text-[15px] leading-relaxed text-white/90">{message.summary}</p>
                      )}
                      <div className="max-w-sm">
                        <FieldPanel advice={message.advice} land={message.land} cropLabel={message.crop} />
                      </div>
                    </div>
                  );
                })}
                {sending && (
                  <div className="flex gap-1.5 py-1" aria-label="Fergie is typing">
                    <span className="size-2 animate-bounce rounded-full bg-emerald-400/70 [animation-delay:-0.3s]" />
                    <span className="size-2 animate-bounce rounded-full bg-emerald-400/70 [animation-delay:-0.15s]" />
                    <span className="size-2 animate-bounce rounded-full bg-emerald-400/70" />
                  </div>
                )}
                <div ref={endRef} />
              </div>
            )}
          </div>

          <div className="border-t border-white/10">
            <div className="mx-auto max-w-3xl px-4 py-3">
              <ChatInput
                variant="default"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onSubmit={submit}
                loading={sending}
                className="rounded-2xl border-white/15 bg-white/[0.04] focus-within:ring-emerald-400/40"
              >
                <ChatInputTextArea
                  placeholder="Ask Fergie anything, or name another crop…"
                  className="bg-transparent text-[15px] text-white placeholder:text-white/50"
                />
                <ChatInputSubmit className="border-transparent bg-primary text-primary-foreground hover:bg-primary/90" />
              </ChatInput>
              <p className="mt-2 text-center text-xs text-white/35">
                Fergie uses live weather, terrain, soil and land use data. Check important decisions.
              </p>
            </div>
          </div>
        </div>

        <Modal open={showCrop} onClose={() => setShowCrop(false)} title="Plant something else">
          <p className="mb-3 text-sm text-white/60">Same field, new crop. Fergie works out the timing and outlook.</p>
          <input
            autoFocus
            aria-label="Crop"
            maxLength={60}
            value={modalCrop}
            onChange={(event) => setModalCrop(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && addCrop(modalCrop)}
            placeholder="Crop, e.g. spinach"
            className={INPUT}
          />
          <button onClick={() => addCrop(modalCrop)} disabled={!modalCrop.trim()} className={`mt-3 ${PRIMARY}`}>
            Get advice
          </button>
        </Modal>

        <Modal open={showSettings} onClose={() => setShowSettings(false)} title="Settings">
          <label className="text-sm text-white/60" htmlFor="settings-postcode">
            Change postcode
          </label>
          <input
            id="settings-postcode"
            aria-label="Postcode"
            maxLength={60}
            value={settingsPostcode}
            onChange={(event) => setSettingsPostcode(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && changeLocation(settingsPostcode)}
            placeholder="Postcode"
            className={`mt-1.5 ${INPUT}`}
          />
          {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
          <button onClick={() => changeLocation(settingsPostcode)} disabled={!settingsPostcode.trim()} className={`mt-3 ${PRIMARY}`}>
            Change field
          </button>
          <button
            onClick={() => {
              adjustPin();
              setShowSettings(false);
            }}
            className={`mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/15 ${FOCUS}`}
          >
            <MapPin className="size-4" aria-hidden="true" /> Re-pin this field
          </button>

          {memory.length > 0 && (
            <div className="mt-5 border-t border-white/10 pt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-white/60">What Fergie remembers</p>
                <button
                  onClick={() => setMemory([])}
                  className={`rounded px-1 text-xs text-white/45 transition hover:text-red-300 ${FOCUS}`}
                >
                  Forget all
                </button>
              </div>
              <ul className="mt-2 space-y-1.5">
                {memory.map((fact, index) => (
                  <li key={index} className="group flex items-start gap-2 text-[13px] text-white/70">
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-emerald-400" />
                    <span className="flex-1">{fact}</span>
                    <button
                      onClick={() => setMemory((prev) => prev.filter((_, i) => i !== index))}
                      aria-label="Forget this"
                      className="shrink-0 text-white/25 transition hover:text-red-300"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Modal>

        {menu && (
          <>
            <button aria-label="Close menu" onClick={() => setMenu(null)} className="fixed inset-0 z-40 cursor-default" />
            <div
              className="fixed z-50 w-44 rounded-lg border border-white/10 bg-neutral-900 p-1 text-sm shadow-2xl"
              style={{ top: menu.y, left: menu.x }}
            >
              <button
                onClick={() => startRename(menu.id)}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-white/80 transition hover:bg-white/10"
              >
                <Pencil className="size-3.5" aria-hidden="true" /> Rename
              </button>
              {folders.length > 0 && (
                <div className="mt-1 border-t border-white/10 pt-1">
                  <p className="px-2 py-1 text-xs text-white/40">Move to</p>
                  {folders.map((folder) => (
                    <button
                      key={folder.id}
                      onClick={() => moveChat(menu.id, folder.id)}
                      className="block w-full truncate rounded px-2 py-1.5 text-left text-white/80 transition hover:bg-white/10"
                    >
                      {folder.name}
                    </button>
                  ))}
                  {chats.find((c) => c.id === menu.id)?.folderId && (
                    <button
                      onClick={() => moveChat(menu.id, null)}
                      className="block w-full rounded px-2 py-1.5 text-left text-white/60 transition hover:bg-white/10"
                    >
                      Remove from folder
                    </button>
                  )}
                </div>
              )}
              <button
                onClick={() => deleteChat(menu.id)}
                className="mt-1 flex w-full items-center gap-2 rounded border-t border-white/10 px-2 py-1.5 text-left text-red-300 transition hover:bg-red-500/10"
              >
                <Trash2 className="size-3.5" aria-hidden="true" /> Delete
              </button>
            </div>
          </>
        )}
      </main>
    );
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-black text-white antialiased duration-700 animate-in fade-in motion-reduce:animate-none">
      <GridBackground />
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center px-5 pb-16 pt-14">
        <span className="text-sm font-medium tracking-tight text-white/70">Fergie</span>

        <h1 className="mt-5 text-center text-4xl font-light tracking-tight text-white md:text-6xl">
          {phase === "map" ? "Pin your field" : "When & where to plant"}
        </h1>
        {phase === "input" && (
          <p className="mt-5 max-w-md text-center text-lg font-light leading-relaxed text-white/70">
            Your postcode and your crop, then drop a pin on your field, and ask Fergie anything after.
          </p>
        )}

        {error && (
          <div className="mt-6 w-full max-w-md rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-center text-sm font-medium text-red-300">
            {error}
          </div>
        )}

        {phase === "input" && (
          <div className="mt-8 w-full max-w-md space-y-2.5 rounded-2xl border border-white/10 bg-white/[0.05] p-3 backdrop-blur-xl">
            <div className="grid gap-2.5 sm:grid-cols-2">
              <Field icon={MapPin} label="Postcode" value={postcode} onChange={setPostcode} onEnter={() => locate()} placeholder="Postcode" />
              <Field icon={Wheat} label="Crop" value={crop} onChange={setCrop} onEnter={() => locate()} placeholder="Crop, e.g. carrot" />
            </div>
            <button onClick={() => locate()} disabled={locating || !ready} className={PRIMARY}>
              {locating && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {locating ? "Finding your area…" : "Find my field"}
              {!locating && <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />}
            </button>
          </div>
        )}

        {phase === "map" && geo && pin && (
          <div className="mt-8 w-full max-w-md space-y-3 rounded-2xl border border-white/10 bg-white/[0.05] p-3 backdrop-blur-xl duration-500 animate-in fade-in motion-reduce:animate-none">
            <div className="flex items-center justify-between gap-2 px-1">
              <span className="flex min-w-0 items-center gap-1.5 text-sm text-white/75">
                <MapPin className="size-4 shrink-0 text-emerald-400" aria-hidden="true" />
                <span className="truncate">{place}</span>
              </span>
              <button onClick={changeField} className={`shrink-0 rounded-md px-2.5 py-1 text-sm text-white/60 transition hover:text-white ${FOCUS}`}>
                Change
              </button>
            </div>
            <div className="overflow-hidden rounded-xl border border-white/10">
              <FieldMap center={{ lat: geo.latitude, lon: geo.longitude }} pin={pin} onPick={(lat, lon) => patch(() => ({ pin: { lat, lon } }))} />
            </div>
            <p className="text-center text-xs text-white/60">Drag the pin onto your field, or tap the map</p>
            <button onClick={() => start()} className={PRIMARY}>
              Get advice
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </button>
          </div>
        )}

        {phase === "loading" && <FieldLoading place={geo?.name || place} />}
      </div>
    </main>
  );
}
