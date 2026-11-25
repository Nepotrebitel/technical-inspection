"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Manrope } from "next/font/google";

const manrope = Manrope({ subsets: ["cyrillic", "latin"], weight: ["400", "500", "600", "700", "800"] });
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

type BookingStatus = "confirmed" | "completed" | "no_show" | "cancelled";

type BookingItem = {
  id: number;
  carNumber: string;
  phone: string | null;
  category: string;
  date: string;
  time: string;
  status: BookingStatus;
  source: string;
  comment: string | null;
  emailStatus: string;
  maxStatus: string;
  utmSource: string | null;
  consentAccepted: boolean;
  consentTimestamp: string;
  clientIp: string | null;
  createdAt: string;
};

type BlockedSlotItem = {
  id: number;
  date: string;
  time: string;
  reason: string | null;
};

type AnalyticsReport = {
  periodDays: number;
  overview: {
    uniqueVisitors: number;
    avgActiveTimeSec: number;
    confirmedBookings: number;
    conversionPercent: number;
    completedVisits: number;
    noShowVisits: number;
    cancelledVisits: number;
  };
  bookingFunnel: { step: string; count: number }[];
  hourlyHeatmap: { time: string; count: number }[];
  devices: Record<string, number>;
  sectionsReached: Record<string, number>;
  topUserActions: Record<string, number>;
  trafficSources: Record<string, number>;
};

type LogItem = {
  id: number;
  level: string;
  source: string;
  message: string;
  details: string | null;
  urlPath: string | null;
  clientIp: string | null;
  createdAt: string;
};

const TIME_SLOTS_ALL = [
  "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
  "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
  "17:00", "17:30",
];

function getTodayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function AdminDashboardPage() {
  const [adminKey, setAdminKey] = useState("");
  const [inputKey, setInputKey] = useState("");
  const [authError, setAuthError] = useState("");
  const [activeTab, setActiveTab] = useState<"bookings" | "analytics" | "system">("bookings");

  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlotItem[]>([]);
  const [filterDate, setFilterDate] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Форма ручной записи диспетчером
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualCar, setManualCar] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualDate, setManualDate] = useState("");
  const [manualTime, setManualTime] = useState("10:00");
  const [manualComment, setManualComment] = useState("");
  const [manualMsg, setManualMsg] = useState("");

  // Форма закрытия слота
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [blockDate, setBlockDate] = useState("");
  const [isBlockTimeOpen, setIsBlockTimeOpen] = useState(false);
  const [blockTime, setBlockTime] = useState("13:00");
  const [blockReason, setBlockReason] = useState("Обед / Технический перерыв");

  // Аналитика и диагностика
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [reportError, setReportError] = useState<string>("");
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [blockedAttacks24h, setBlockedAttacks24h] = useState<number>(0);
  const [testNotifyResult, setTestNotifyResult] = useState<{
    email: { status: string; detail: string };
    max: { status: string; detail: string };
  } | null>(null);
  const [isTestingNotify, setIsTestingNotify] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isManualTimeOpen, setIsManualTimeOpen] = useState(false);
  useEffect(() => {
    const today = getTodayIso();
    setManualDate(today);
    setBlockDate(today);
  }, []);

  const fetchAllData = useCallback(async (key: string, dateFilter: string, search: string) => {
    setLoading(true);
    setAuthError("");
    const headers = { "X-Admin-Key": key, Accept: "application/json" };

    try {
      const params = new URLSearchParams();
      if (dateFilter) params.set("date", dateFilter);
      if (search.trim()) params.set("search", search.trim());
      const queryStr = params.toString() ? `?${params.toString()}` : "";

      const blockedUrl = dateFilter
        ? `${API_BASE_URL}/api/admin/blocked-slots?date=${encodeURIComponent(dateFilter)}`
        : `${API_BASE_URL}/api/admin/blocked-slots`;

      const [resBookings, resBlocked, resAnalytics, resLogs, resSec] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/bookings${queryStr}`, { headers }),
        fetch(blockedUrl, { headers }),
        fetch(`${API_BASE_URL}/api/analytics/report?days=14`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/logs?limit=100`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/security-stats`, { headers }),
      ]);

      if (resBookings.status === 401 || resBookings.status === 429) {
        const errData = await resBookings.json().catch(() => ({}));
        setAuthError(errData.detail || "Неверный ключ доступа администратора.");
        sessionStorage.removeItem("tp_admin_key");
        setAdminKey("");
        return;
      }

      if (resBookings.ok) setBookings(await resBookings.json());
      if (resBlocked.ok) setBlockedSlots(await resBlocked.json());
      if (resAnalytics.ok) {
        setReport(await resAnalytics.json());
        setReportError("");
        } else {
        const errBody = await resAnalytics.json().catch(() => ({}));
        setReportError(`Ошибка загрузки аналитики (HTTP ${resAnalytics.status}): ${errBody.detail || "проверьте /api/analytics/report"}`);
        }
      if (resLogs.ok) setLogs(await resLogs.json());
      if (resSec.ok) {
        const secData = await resSec.json();
        setBlockedAttacks24h(secData.blockedAttacks24h || 0);
      }
    } catch {
      setAuthError("Не удалось подключиться к серверу API.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
      const saved = sessionStorage.getItem("tp_admin_key");
      if (!saved) return;
      setAdminKey(saved);

      const delay = searchQuery ? 350 : 0;
      const timer = setTimeout(() => {
        fetchAllData(saved, filterDate, searchQuery);
      }, delay);

      return () => clearTimeout(timer);
    }, [fetchAllData, filterDate, searchQuery]);  

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputKey.trim()) return;
    sessionStorage.setItem("tp_admin_key", inputKey.trim());
    setAdminKey(inputKey.trim());
    fetchAllData(inputKey.trim(), filterDate, searchQuery);
  };

  const handleLogout = () => {
    sessionStorage.removeItem("tp_admin_key");
    setAdminKey("");
    setInputKey("");
  };

  const adminFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response | null> => {
      try {
        const res = await fetch(url, {
          ...options,
          headers: {
            Accept: "application/json",
            ...(options.headers || {}),
            "X-Admin-Key": adminKey,
          },
        });

        if (res.status === 401 || res.status === 429) {
          const errData = await res.json().catch(() => ({}));
          setAuthError(errData.detail || "Сессия завершена. Введите ключ доступа заново.");
          sessionStorage.removeItem("tp_admin_key");
          setAdminKey("");
          return null;
        }
        return res;
      } catch {
        alert("Не удалось связаться с сервером API. Проверьте соединение.");
        return null;
      }
    },
    [adminKey]
  );

  // Автовыход через 30 минут бездействия на посту ТО (защита ПДн по 152-ФЗ)
  useEffect(() => {
    if (!adminKey) return;
    let timer: ReturnType<typeof setTimeout>;
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        sessionStorage.removeItem("tp_admin_key");
        setAdminKey("");
        setAuthError("Сессия автоматически завершена после 30 минут бездействия.");
      }, 30 * 60 * 1000);
    };

    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((ev) => window.addEventListener(ev, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      clearTimeout(timer);
      events.forEach((ev) => window.removeEventListener(ev, resetTimer));
    };
  }, [adminKey]);

  // Ручная запись клиента
 const handleCreateManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualMsg("");
    const res = await adminFetch(`${API_BASE_URL}/api/admin/bookings/manual`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        carNumber: manualCar,
        phone: manualPhone || null,
        date: manualDate,
        time: manualTime,
        comment: manualComment || null,
      }),
    });
    if (!res) return;
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setManualCar("");
      setManualPhone("");
      setManualComment("");
      setShowManualForm(false);
      setIsManualTimeOpen(false);
      fetchAllData(adminKey, filterDate, searchQuery);
    } else {
      setManualMsg(data.detail || "Ошибка при добавлении записи.");
    }
  };

  const handleBlockSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await adminFetch(`${API_BASE_URL}/api/admin/blocked-slots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: blockDate, time: blockTime, reason: blockReason }),
    });
    if (!res) return;
    if (res.ok) {
      setShowBlockForm(false);
      fetchAllData(adminKey, filterDate, searchQuery);
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.detail || "Не удалось закрыть слот.");
    }
  };

  const handleUnblockSlot = async (id: number) => {
    const res = await adminFetch(`${API_BASE_URL}/api/admin/blocked-slots/${id}`, { method: "DELETE" });
    if (res?.ok) fetchAllData(adminKey, filterDate, searchQuery);
  };

  const handleChangeStatus = async (id: number, status: BookingStatus) => {
    const res = await adminFetch(
      `${API_BASE_URL}/api/admin/bookings/${id}/status?status=${encodeURIComponent(status)}`,
      { method: "PATCH" }
    );
    if (res?.ok) fetchAllData(adminKey, filterDate, searchQuery);
  };

  const handleDeletePdn = async (id: number) => {
    if (!confirm(`Безвозвратно удалить запись #${id} и персональные данные клиента (ст. 21 152-ФЗ)?`)) return;
    const res = await adminFetch(`${API_BASE_URL}/api/admin/bookings/${id}`, { method: "DELETE" });
    if (res?.ok) fetchAllData(adminKey, filterDate, searchQuery);
  };


  // Скачивание CSV для Excel
  const handleExportCsv = async () => {
    try {
      const url = filterDate
        ? `${API_BASE_URL}/api/admin/export-csv?date=${filterDate}`
        : `${API_BASE_URL}/api/admin/export-csv`;

      const res = await fetch(url, {
        headers: { "X-Admin-Key": adminKey },
      });

      if (!res.ok) {
        alert(`Ошибка выгрузки таблицы (код ${res.status})`);
        return;
      }

      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `tehplus-bookings-${filterDate || "all"}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);
    } catch {
      alert("Не удалось связаться с сервером API. Проверьте, запущен ли бэкенд.");
    }
  };
  // Тест почты и MAX
  const handleTestNotifications = async () => {
    setIsTestingNotify(true);
    setTestNotifyResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/test-notifications`, {
        method: "POST",
        headers: { "X-Admin-Key": adminKey },
      });
      if (res.ok) {
        setTestNotifyResult(await res.json());
      }
    } finally {
      setIsTestingNotify(false);
    }
  };

  const handleClearLogs = async () => {
    if (!confirm("Очистить журнал ошибок и событий?")) return;
    const res = await adminFetch(`${API_BASE_URL}/api/admin/logs`, { method: "DELETE" });
    if (res?.ok) setLogs([]);
  };

  if (!adminKey) {
    return (
      <main className={`min-h-screen bg-[#F8F9F7] text-[#151C2B] flex items-center justify-center p-4 ${manrope.className}`}>
        <form
          onSubmit={handleLogin}
          className="w-full max-w-md bg-white rounded-[28px] p-6 sm:p-8 shadow-xl border border-[#E8EBE8] space-y-5"
        >
          <div>
            <span className="inline-block px-3 py-1 rounded-full bg-[#EEF3ED] text-[#5B8E52] text-xs font-extrabold uppercase">
              ТЕХПЛЮС • Диспетчерская
            </span>
            <h1 className="text-2xl font-extrabold text-[#61403A] mt-2">Вход для администратора</h1>
            <p className="text-xs sm:text-sm text-[#657080] mt-1">
              Введите секретный ключ доступа (ADMIN_API_KEY) для управления линией, просмотра аналитики и журнала событий.
            </p>
          </div>

          <input
            type="password"
            required
            autoComplete="current-password"
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            placeholder="Секретный ключ доступа..."
            className="w-full p-3.5 rounded-2xl bg-[#F8F9F7] border border-[#E8EBE8] focus:outline-none focus:border-[#8BBA82] text-sm font-semibold"
          />

          {authError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
              {authError}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3.5 rounded-full bg-[#61403A] hover:bg-[#4e332e] text-white font-extrabold text-sm transition-colors cursor-pointer"
          >
            Войти в панель
          </button>
        </form>
      </main>
    );
  }

  const errorLogsCount = logs.filter((l) => l.level === "ERROR").length;
  const maxFunnelCount = report?.bookingFunnel?.[0]?.count || 1;
  const maxHeatCount = Math.max(...((report?.hourlyHeatmap || []).map((h) => h.count)), 1);

  const renderDeliveryBadge = (label: string, state: string) => {
    if (state === "sent") {
      return <span className="px-2 py-0.5 rounded bg-[#EEF3ED] text-[#5B8E52] font-bold">{label} ✓</span>;
    }
    if (state === "error") {
      return <span className="px-2 py-0.5 rounded bg-red-50 text-red-600 font-bold">{label} ✕</span>;
    }
    return <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-500 font-semibold">{label} —</span>;
  };

  return (
    <main className={`min-h-screen bg-[#F8F9F7] text-[#151C2B] pb-16 ${manrope.className}`}>
      {/* Шапка админ-панели */}
      <header className="bg-[#61403A] text-white px-4 sm:px-8 py-4 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="font-extrabold text-lg sm:text-xl tracking-tight">ТЕХПЛЮС • Управление</span>
            <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-[#8BBA82] text-xs font-bold">
              РСА № 16412
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchAllData(adminKey, filterDate, searchQuery)}
              className="px-3.5 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-xs font-bold transition-colors cursor-pointer"
            >
              {loading ? "Обновление..." : "Обновить"}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="px-3.5 py-1.5 rounded-full bg-red-500/20 hover:bg-red-500/35 text-red-200 text-xs font-bold transition-colors cursor-pointer"
            >
              Выйти
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 space-y-6">
        {/* Навигация по 3 вкладкам */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("bookings")}
            className={`px-4 py-2.5 rounded-full text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
              activeTab === "bookings"
                ? "bg-[#61403A] text-white shadow-md"
                : "bg-white text-[#657080] border border-[#E8EBE8]"
            }`}
          >
            1. Линия и расписание ({bookings.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("analytics")}
            className={`px-4 py-2.5 rounded-full text-xs sm:text-sm font-extrabold transition-all cursor-pointer ${
              activeTab === "analytics"
                ? "bg-[#61403A] text-white shadow-md"
                : "bg-white text-[#657080] border border-[#E8EBE8]"
            }`}
          >
            2. Воронка и тепловая карта
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("system")}
            className={`px-4 py-2.5 rounded-full text-xs sm:text-sm font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "system"
                ? "bg-[#61403A] text-white shadow-md"
                : "bg-white text-[#657080] border border-[#E8EBE8]"
            }`}
          >
            <span>3. Диагностика, MAX и защита</span>
            {errorLogsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[11px] font-black">
                {errorLogsCount}
              </span>
            )}
          </button>
        </div>

        {/* =====================================================================
            ВКЛАДКА 1: ОПЕРАТИВНОЕ УПРАВЛЕНИЕ ЛИНИЕЙ И РАСПИСАНИЕМ
           ===================================================================== */}
        {activeTab === "bookings" && (
          <div className="space-y-4">
            {/* Панель инструментов диспетчера */}
            <div className="bg-white p-4 rounded-2xl border border-[#E8EBE8] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Фильтр по дате и быстрые кнопки */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFilterDate(getTodayIso())}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer ${
                      filterDate === getTodayIso()
                        ? "bg-[#8BBA82] text-white"
                        : "bg-[#F8F9F7] text-[#61403A] border border-[#E8EBE8]"
                    }`}
                  >
                    Сегодня
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterDate("")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold cursor-pointer ${
                      filterDate === ""
                        ? "bg-[#8BBA82] text-white"
                        : "bg-[#F8F9F7] text-[#61403A] border border-[#E8EBE8]"
                    }`}
                  >
                    Все даты
                  </button>
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-[#E8EBE8] text-xs font-bold"
                  />
                </div>

                {/* Кнопки действий */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowManualForm((v) => !v);
                      setShowBlockForm(false);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-[#8BBA82] hover:bg-[#77a66f] text-white text-xs font-extrabold cursor-pointer shadow-sm"
                  >
                    + Записать по звонку
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBlockForm((v) => !v);
                      setShowManualForm(false);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-extrabold cursor-pointer"
                  >
                    Закрыть слот
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCsv}
                    className="px-3.5 py-2 rounded-xl bg-[#F8F9F7] hover:bg-[#EEF3ED] text-[#61403A] border border-[#E8EBE8] text-xs font-extrabold cursor-pointer"
                  >
                    Выгрузить Excel (.xlsx)
                  </button>
                </div>
              </div>

              {/* Быстрый поиск по госномеру или телефону */}
              <div className="pt-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Быстрый поиск у ворот: введите госномер (например, А123АА) или последние цифры телефона..."
                  className="w-full px-4 py-2.5 rounded-xl bg-[#F8F9F7] border border-[#E8EBE8] focus:outline-none focus:border-[#8BBA82] text-xs sm:text-sm font-semibold"
                />
              </div>
            </div>

            {/* Выпадающая форма ручной записи */}
            {showManualForm && (
              <form
                onSubmit={handleCreateManual}
                className="bg-white p-5 rounded-2xl border-2 border-[#8BBA82] shadow-md space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-[#61403A] text-sm sm:text-base">
                    Новая ручная запись (по звонку / живая очередь)
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowManualForm(false)}
                    className="text-xs font-bold text-[#657080] cursor-pointer"
                  >
                    Закрыть ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <input
                    required
                    type="text"
                    placeholder="Госномер (А 123 АА 161)"
                    value={manualCar}
                    onChange={(e) => setManualCar(e.target.value)}
                    className="p-2.5 rounded-xl border border-[#E8EBE8] text-sm font-bold uppercase"
                  />
                  <input
                    type="tel"
                    placeholder="Телефон (необязательно)"
                    value={manualPhone}
                    onChange={(e) => setManualPhone(e.target.value)}
                    className="p-2.5 rounded-xl border border-[#E8EBE8] text-sm"
                  />
                  <input
                    required
                    type="date"
                    value={manualDate}
                    onChange={(e) => setManualDate(e.target.value)}
                    className="p-2.5 rounded-xl border border-[#E8EBE8] text-sm font-semibold"
                  />
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsManualTimeOpen((prev) => !prev)}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl border border-[#E8EBE8] bg-white text-sm font-bold text-[#61403A] hover:border-[#8BBA82] transition-colors cursor-pointer"
                    >
                      <span>{manualTime}</span>
                      <svg
                        className={`h-4 w-4 text-[#657080] transition-transform ${isManualTimeOpen ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {isManualTimeOpen && (
                      <div className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-52 overflow-y-auto rounded-xl border border-[#E8EBE8] bg-white p-1.5 shadow-lg">
                        <div className="grid grid-cols-3 gap-1">
                          {TIME_SLOTS_ALL.map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => {
                                setManualTime(t);
                                setIsManualTimeOpen(false);
                              }}
                              className={`rounded-lg py-1.5 text-center text-xs font-bold transition-colors cursor-pointer ${
                                manualTime === t
                                  ? "bg-[#8BBA82] text-white"
                                  : "text-[#61403A] hover:bg-[#F4F6F4]"
                              }`}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Примечание (например, Газель)"
                    value={manualComment}
                    onChange={(e) => setManualComment(e.target.value)}
                    className="p-2.5 rounded-xl border border-[#E8EBE8] text-sm"
                  />
                </div>

                {manualMsg && <div className="text-xs font-bold text-red-600">{manualMsg}</div>}

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#8BBA82] text-white text-xs font-extrabold cursor-pointer"
                >
                  Сохранить и занять 1 место в слоте
                </button>
              </form>
            )}

            {/* Выпадающая форма закрытия слота */}
            {showBlockForm && (
              <form
                onSubmit={handleBlockSlot}
                className="bg-white p-5 rounded-2xl border-2 border-amber-300 shadow-md space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-[#61403A] text-sm sm:text-base">
                    Закрыть временное окно для онлайн-записи с сайта
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowBlockForm(false)}
                    className="text-xs font-bold text-[#657080] cursor-pointer"
                  >
                    Закрыть ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    required
                    type="date"
                    value={blockDate}
                    onChange={(e) => setBlockDate(e.target.value)}
                    className="p-2.5 rounded-xl border border-[#E8EBE8] text-sm font-semibold"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      required
                      type="date"
                      value={blockDate}
                      onChange={(e) => setBlockDate(e.target.value)}
                      className="p-2.5 rounded-xl border border-[#E8EBE8] text-sm font-semibold"
                    />

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsBlockTimeOpen((prev) => !prev)}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl border border-[#E8EBE8] bg-white text-sm font-bold text-[#61403A] hover:border-amber-400 transition-colors cursor-pointer"
                      >
                        <span>{blockTime}</span>
                        <svg
                          className={`h-4 w-4 text-[#657080] transition-transform ${isBlockTimeOpen ? "rotate-180" : ""}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {isBlockTimeOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-20"
                            onClick={() => setIsBlockTimeOpen(false)}
                          />
                          <div className="absolute left-0 sm:left-auto sm:right-0 top-full z-30 mt-1.5 w-[270px] sm:w-[300px] max-h-64 overflow-y-auto rounded-2xl border border-[#E8EBE8] bg-white p-2.5 shadow-xl">
                            <div className="grid grid-cols-3 gap-1.5">
                              {TIME_SLOTS_ALL.map((t) => (
                                <button
                                  key={t}
                                  type="button"
                                  onClick={() => {
                                    setBlockTime(t);
                                    setIsBlockTimeOpen(false);
                                  }}
                                  className={`rounded-lg py-1.5 text-center text-xs font-bold transition-colors cursor-pointer ${
                                    blockTime === t
                                      ? "bg-amber-600 text-white"
                                      : "text-[#61403A] hover:bg-[#F4F6F4]"
                                  }`}
                                >
                                  {t}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    <input
                      type="text"
                      value={blockReason}
                      onChange={(e) => setBlockReason(e.target.value)}
                      placeholder="Причина закрытия..."
                      className="p-2.5 rounded-xl border border-[#E8EBE8] text-sm"
                    />
                  </div>
                  <input
                    type="text"
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    placeholder="Причина закрытия..."
                    className="p-2.5 rounded-xl border border-[#E8EBE8] text-sm"
                  />
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-600 text-white text-xs font-extrabold cursor-pointer"
                >
                  Закрыть выбранное окно
                </button>
              </form>
            )}

            {/* Активные блокировки слотов */}
            {blockedSlots.length > 0 && (
              <div className="bg-amber-50/80 border border-amber-200 p-3.5 rounded-2xl flex flex-wrap items-center gap-2">
                <span className="text-xs font-extrabold text-amber-900">Закрытые окна:</span>
                {blockedSlots.map((bs) => (
                  <span
                    key={bs.id}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-amber-200 text-xs font-bold text-[#61403A]"
                  >
                    <span>
                      {bs.date} • {bs.time} ({bs.reason})
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUnblockSlot(bs.id)}
                      className="text-red-600 font-black hover:underline cursor-pointer"
                      title="Открыть окно"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Список записей */}
            {bookings.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-[#E8EBE8] text-center text-sm text-[#657080]">
                Записей по выбранному фильтру пока нет.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {bookings.map((item) => (
                  <div
                    key={item.id}
                    className={`p-4 sm:p-5 rounded-2xl border shadow-sm space-y-3 ${
                      item.status === "cancelled"
                        ? "bg-gray-50 border-gray-200 opacity-65"
                        : item.status === "completed"
                        ? "bg-[#EEF3ED]/40 border-[#8BBA82]/50"
                        : "bg-white border-[#E8EBE8]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-[#657080]">#{item.id}</span>
                          <span className="px-2 py-0.5 rounded bg-[#F8F9F7] border border-[#E8EBE8] text-[10px] font-bold text-[#657080]">
                            {item.source === "online" ? "Сайт" : "Звонок / Диспетчер"}
                          </span>
                        </div>
                        <div className="text-lg font-black text-[#61403A] mt-0.5">
                          {item.date} • {item.time}
                        </div>
                      </div>

                      {/* Селектор статуса визита */}
                      <select
                        value={item.status}
                        onChange={(e) => handleChangeStatus(item.id, e.target.value as BookingStatus)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-extrabold border cursor-pointer ${
                          item.status === "completed"
                            ? "bg-[#EEF3ED] text-[#5B8E52] border-[#8BBA82]"
                            : item.status === "no_show"
                            ? "bg-amber-50 text-amber-800 border-amber-300"
                            : item.status === "cancelled"
                            ? "bg-red-50 text-red-600 border-red-200"
                            : "bg-white text-[#61403A] border-[#E8EBE8]"
                        }`}
                      >
                        <option value="confirmed">Ожидается</option>
                        <option value="completed">Приехал / Прошёл ТО ✓</option>
                        <option value="no_show">Не явился ✕</option>
                        <option value="cancelled">Отменена (освободить слот)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm bg-[#F8F9F7] p-3 rounded-xl border border-[#E8EBE8]">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-[#657080]">Госномер ТС</div>
                        <div className="font-black text-[#151C2B] text-base">{item.carNumber}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-bold text-[#657080]">Телефон</div>
                        <div className="font-bold text-[#151C2B]">
                          {item.phone ? (
                            <a href={`tel:${item.phone}`} className="text-[#5B8E52] underline">
                              {item.phone}
                            </a>
                          ) : (
                            "Не указан"
                          )}
                        </div>
                      </div>
                    </div>

                    {item.comment && (
                      <div className="text-xs font-semibold text-[#61403A] bg-amber-50/70 px-3 py-1.5 rounded-lg">
                        Примечание: {item.comment}
                      </div>
                    )}

                    {/* Статусы доставки уведомлений + удаление ПДн */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        {renderDeliveryBadge("MAX", item.maxStatus)}
                        {renderDeliveryBadge("Email", item.emailStatus)}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeletePdn(item.id)}
                        className="text-red-600 hover:underline font-bold cursor-pointer"
                      >
                        Удалить ПДн (152-ФЗ)
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

       {/* =====================================================================
            ВКЛАДКА 2: ВОРОНКА ФОРМЫ, ДОХОДИМОСТЬ И ТЕПЛОВАЯ КАРТА
           ===================================================================== */}
        {activeTab === "analytics" && (
          !report ? (
            <div className="bg-white p-6 rounded-2xl border border-[#E8EBE8] text-center space-y-2">
              <div className="text-sm font-bold text-[#61403A]">
                {loading ? "Загрузка данных аналитики..." : "Не удалось отобразить отчёт аналитики"}
              </div>
              {reportError && (
                <div className="text-xs font-mono text-red-600 bg-red-50 p-3 rounded-xl inline-block">
                  {reportError}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {/* Верхние KPI карточки */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E8EBE8]">
                  <div className="text-xs font-bold text-[#657080]">Посетителей (14 дн.)</div>
                  <div className="text-2xl sm:text-3xl font-black text-[#61403A] mt-1">
                    {report.overview?.uniqueVisitors ?? 0}
                  </div>
                  <div className="text-[11px] text-[#657080] mt-1">
                    Ср. время: <strong>{report.overview?.avgActiveTimeSec ?? 0} сек</strong>
                  </div>
                </div>

                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E8EBE8]">
                  <div className="text-xs font-bold text-[#657080]">Онлайн-заявок</div>
                  <div className="text-2xl sm:text-3xl font-black text-[#5B8E52] mt-1">
                    {report.overview?.confirmedBookings ?? 0}
                  </div>
                  <div className="text-[11px] text-[#5B8E52] font-bold mt-1">
                    Конверсия: {report.overview?.conversionPercent ?? 0}%
                  </div>
                </div>

                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E8EBE8]">
                  <div className="text-xs font-bold text-[#657080]">Фактически прошли ТО</div>
                  <div className="text-2xl sm:text-3xl font-black text-[#5B8E52] mt-1">
                    {report.overview?.completedVisits ?? 0}
                  </div>
                  <div className="text-[11px] text-[#657080] mt-1">
                    Отмечено мастером
                  </div>
                </div>

                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-[#E8EBE8]">
                  <div className="text-xs font-bold text-[#657080]">Не явились / Отмены</div>
                  <div className="text-2xl sm:text-3xl font-black text-amber-700 mt-1">
                    {report.overview?.noShowVisits ?? 0} / {report.overview?.cancelledVisits ?? 0}
                  </div>
                  <div className="text-[11px] text-[#657080] mt-1">
                    Потери после записи
                  </div>
                </div>
              </div>

              {/* Пошаговая воронка формы бронирования + Тепловая карта часов */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Воронка */}
                <div className="bg-white p-5 rounded-2xl border border-[#E8EBE8] space-y-3">
                  <div>
                    <h3 className="font-extrabold text-[#61403A] text-base">
                      Пошаговая воронка записи на сайте
                    </h3>
                    <p className="text-xs text-[#657080]">
                      Показывает, на каком шаге посетители уходят, не завершив запись
                    </p>
                  </div>

                  <div className="space-y-2.5 pt-1">
                    {(report.bookingFunnel || []).map((item) => {
                      const pct = Math.min(100, Math.round((item.count / maxFunnelCount) * 100));
                      return (
                        <div key={item.step} className="space-y-1">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-[#151C2B]">{item.step}</span>
                            <span className="text-[#61403A]">{item.count} чел.</span>
                          </div>
                          <div className="w-full h-2.5 bg-[#F8F9F7] rounded-full overflow-hidden border border-[#E8EBE8]">
                            <div
                              className="h-full bg-[#8BBA82] rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Тепловая карта часов */}
                <div className="bg-white p-5 rounded-2xl border border-[#E8EBE8] space-y-3">
                  <div>
                    <h3 className="font-extrabold text-[#61403A] text-base">
                      Тепловая карта загрузки по часам
                    </h3>
                    <p className="text-xs text-[#657080]">
                      Самые популярные временные слоты за последние 14 дней
                    </p>
                  </div>

                  {(report.hourlyHeatmap || []).length === 0 ? (
                    <p className="text-xs text-[#657080] py-6 text-center">Пока недостаточно данных о записях.</p>
                  ) : (
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 pt-1">
                      {(report.hourlyHeatmap || []).map((slot) => {
                        const intensity = slot.count / maxHeatCount;
                        const bgClass =
                          intensity > 0.75
                            ? "bg-[#61403A] text-white"
                            : intensity > 0.4
                            ? "bg-[#8BBA82] text-white"
                            : "bg-[#EEF3ED] text-[#61403A]";
                        return (
                          <div
                            key={slot.time}
                            className={`p-2.5 rounded-xl text-center border border-black/5 ${bgClass}`}
                          >
                            <div className="text-xs font-extrabold">{slot.time}</div>
                            <div className="text-sm font-black mt-0.5">{slot.count} авт.</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Устройства и источники трафика */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-[#E8EBE8] space-y-2">
                  <h3 className="font-extrabold text-[#61403A]">Устройства посетителей</h3>
                  {Object.entries(report.devices || {}).map(([dev, cnt]) => (
                    <div key={dev} className="flex justify-between text-sm border-b border-[#F8F9F7] pb-1.5">
                      <span>{dev === "mobile" ? "Смартфоны (Mobile)" : dev === "tablet" ? "Планшеты" : "Компьютеры (Desktop)"}</span>
                      <span className="font-extrabold text-[#5B8E52]">{cnt}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-white p-5 rounded-2xl border border-[#E8EBE8] space-y-2">
                  <h3 className="font-extrabold text-[#61403A]">Источники трафика (UTM)</h3>
                  {Object.entries(report.trafficSources || {}).map(([src, cnt]) => (
                    <div key={src} className="flex justify-between text-sm border-b border-[#F8F9F7] pb-1.5">
                      <span>{src}</span>
                      <span className="font-extrabold text-[#61403A]">{cnt}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        )}

        {/* =====================================================================
            ВКЛАДКА 3: ДИАГНОСТИКА ПОЧТЫ/MAX, ЗАЩИТА ОТ БОТОВ И ЖУРНАЛ ОШИБОК
           ===================================================================== */}
        {activeTab === "system" && (
          <div className="space-y-4">
            {/* Панель проверки уведомлений и счётчик атак */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 bg-white p-5 rounded-2xl border border-[#E8EBE8] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-[#61403A] text-base">
                      Проверка доставки в мессенджер MAX и Яндекс.Почту
                    </h3>
                    <p className="text-xs text-[#657080]">
                      Отправит тестовое сообщение, чтобы убедиться, что токен бота и пароль SMTP работают
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isTestingNotify}
                    onClick={handleTestNotifications}
                    className="px-4 py-2.5 rounded-xl bg-[#61403A] hover:bg-[#4b312c] text-white text-xs font-extrabold cursor-pointer"
                  >
                    {isTestingNotify ? "Отправка теста..." : "Тест почты и MAX"}
                  </button>
                </div>

                {testNotifyResult && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
                    <div
                      className={`p-3 rounded-xl border ${
                        testNotifyResult.max.status === "ok"
                          ? "bg-[#EEF3ED] border-[#8BBA82] text-[#151C2B]"
                          : "bg-red-50 border-red-200 text-red-800"
                      }`}
                    >
                      <div className="font-extrabold">Мессенджер MAX:</div>
                      <div className="mt-0.5">{testNotifyResult.max.detail}</div>
                    </div>
                    <div
                      className={`p-3 rounded-xl border ${
                        testNotifyResult.email.status === "ok"
                          ? "bg-[#EEF3ED] border-[#8BBA82] text-[#151C2B]"
                          : "bg-red-50 border-red-200 text-red-800"
                      }`}
                    >
                      <div className="font-extrabold">Почта Яндекс (SMTP):</div>
                      <div className="mt-0.5">{testNotifyResult.email.detail}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Счётчик отбитых атак */}
              <div className="bg-[#61403A] text-white p-5 rounded-2xl shadow-sm flex flex-col justify-between">
                <div className="text-xs font-extrabold uppercase text-[#8BBA82]">
                  Киберзащита (24 часа)
                </div>
                <div className="text-3xl sm:text-4xl font-black my-2">{blockedAttacks24h}</div>
                <div className="text-xs text-white/80">
                  Заблокировано спам-ботов и подозрительных запросов (Honeypot / таймер)
                </div>
              </div>
            </div>

            {/* Журнал ошибок */}
            <div className="bg-white p-4 rounded-2xl border border-[#E8EBE8] flex items-center justify-between">
              <span className="text-xs sm:text-sm font-bold text-[#657080]">
                Журнал ошибок бэкенда, фронтенда, SMTP, MAX и событий безопасности
              </span>
              {logs.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearLogs}
                  className="px-3.5 py-1.5 rounded-xl bg-red-50 text-red-700 text-xs font-extrabold cursor-pointer"
                >
                  Очистить журнал
                </button>
              )}
            </div>

            {logs.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-[#E8EBE8] text-center text-sm text-[#5B8E52] font-bold">
                Ошибок и инцидентов не зафиксировано — все модули работают штатно.
              </div>
            ) : (
              <div className="space-y-2.5">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="bg-white p-4 rounded-2xl border border-[#E8EBE8] shadow-sm space-y-1.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            log.level === "ERROR"
                              ? "bg-red-100 text-red-700"
                              : log.level === "SECURITY"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {log.level}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-[#EEF3ED] text-[#61403A] text-[11px] font-bold">
                          {log.source}
                        </span>
                        {log.urlPath && <span className="text-xs text-[#657080] font-mono">{log.urlPath}</span>}
                      </div>
                      <span className="text-[11px] text-[#657080]">
                        {new Date(log.createdAt).toLocaleString("ru-RU")} • IP: {log.clientIp || "—"}
                      </span>
                    </div>
                    <div className="font-bold text-sm text-[#151C2B]">{log.message}</div>
                    {log.details && (
                      <pre className="text-[11px] bg-[#F8F9F7] p-2.5 rounded-xl overflow-x-auto text-[#657080] border border-[#E8EBE8]">
                        {log.details}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}