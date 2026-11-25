"use client";

import { useEffect } from "react";
import Script from "next/script";

const YM_ID = process.env.NEXT_PUBLIC_YM_ID;
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

type QueuedEvent = {
  sessionId: string;
  eventType: string;
  eventLabel?: string;
  durationSec: number;
  deviceType: string;
  utmSource?: string;
  utmCampaign?: string;
};

let eventQueue: QueuedEvent[] = [];
let activeSeconds = 0;
let sessionIdCache = "";
let utmCache: { source?: string; campaign?: string } = {};

function getDeviceType(): string {
  if (typeof window === "undefined") return "desktop";
  if (window.innerWidth < 768) return "mobile";
  if (window.innerWidth < 1024) return "tablet";
  return "desktop";
}

function getSessionId(): string {
  if (sessionIdCache) return sessionIdCache;
  if (typeof window === "undefined") return "ssr-session";
  const existing = sessionStorage.getItem("tp_sid");
  if (existing) {
    sessionIdCache = existing;
    return existing;
  }
  const generated = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  sessionStorage.setItem("tp_sid", generated);
  sessionIdCache = generated;
  return generated;
}

const reportedErrors = new Set<string>();

function flushEvents() {
  if (eventQueue.length === 0) return;
  const batch = eventQueue.slice(0, 30);
  eventQueue = eventQueue.slice(30);

  const body = JSON.stringify({ events: batch });
  const url = `${API_BASE_URL}/api/analytics/track`;

  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon(url, blob);
  } else {
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  }
}

/** Вызывайте при кликах по кнопкам, телефонам, открытии модалок и отправке формы */
export function trackUserAction(actionName: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined") return;

  // 1. Отправка цели в Яндекс.Метрику
  const ymFn = (
    window as unknown as {
      ym?: (id: number, cmd: string, goal: string, p?: Record<string, unknown>) => void;
    }
  ).ym;
  if (YM_ID && typeof ymFn === "function") {
    ymFn(Number(YM_ID), "reachGoal", actionName, params);
  }

  // 2. Добавление в очередь для нашего российского бэкенда
  eventQueue.push({
    sessionId: getSessionId(),
    eventType: "click_action",
    eventLabel: actionName,
    durationSec: activeSeconds,
    deviceType: getDeviceType(),
    utmSource: utmCache.source,
    utmCampaign: utmCache.campaign,
  });

  if (eventQueue.length >= 5) {
    flushEvents();
  }
}

export function SiteAnalytics() {
  useEffect(() => {
    const sid = getSessionId();
    const device = getDeviceType();

    // Сохраняем UTM-метки при первом заходе с рекламы
    const searchParams = new URLSearchParams(window.location.search);
    const src = searchParams.get("utm_source") || sessionStorage.getItem("tp_utm_source") || undefined;
    const cmp = searchParams.get("utm_campaign") || sessionStorage.getItem("tp_utm_campaign") || undefined;
    if (src) sessionStorage.setItem("tp_utm_source", src);
    if (cmp) sessionStorage.setItem("tp_utm_campaign", cmp);
    utmCache = { source: src, campaign: cmp };

    // 1. Фиксируем вход на сайт
    eventQueue.push({
      sessionId: sid,
      eventType: "page_view",
      eventLabel: window.location.pathname,
      durationSec: 0,
      deviceType: device,
      utmSource: src,
      utmCampaign: cmp,
    });

    // 2. Счётчик активного времени (идёт только когда вкладка открыта и в фокусе)
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        activeSeconds += 1;
        if (activeSeconds % 15 === 0) {
          eventQueue.push({
            sessionId: sid,
            eventType: "session_heartbeat",
            durationSec: activeSeconds,
            deviceType: device,
            utmSource: src,
            utmCampaign: cmp,
          });
          flushEvents();
        }
      }
    }, 1000);

    // 3. Отслеживание глубины прокрутки (25%, 50%, 75%, 100%)
    const reachedScroll = new Set<number>();
    const onScroll = () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      const percent = Math.round((window.scrollY / docHeight) * 100);
      for (const milestone of [25, 50, 75, 100]) {
        if (percent >= milestone && !reachedScroll.has(milestone)) {
          reachedScroll.add(milestone);
          eventQueue.push({
            sessionId: sid,
            eventType: "scroll_depth",
            eventLabel: `${milestone}%`,
            durationSec: activeSeconds,
            deviceType: device,
            utmSource: src,
            utmCampaign: cmp,
          });
        }
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    // 4. Отслеживание просмотра конкретных секций сайта
    const seenSections = new Set<string>();
    const sectionIds = ["docs", "services", "law", "booking", "faq", "contacts"];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.target.id && !seenSections.has(entry.target.id)) {
            seenSections.add(entry.target.id);
            eventQueue.push({
              sessionId: sid,
              eventType: "section_view",
              eventLabel: entry.target.id,
              durationSec: activeSeconds,
              deviceType: device,
              utmSource: src,
              utmCampaign: cmp,
            });
          }
        });
      },
      { threshold: 0.35 }
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    // 5. Отправка оставшихся данных при закрытии/сворачивании страницы
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        eventQueue.push({
          sessionId: sid,
          eventType: "session_heartbeat",
          durationSec: activeSeconds,
          deviceType: device,
          utmSource: src,
          utmCampaign: cmp,
        });
        flushEvents();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    // 6. Перехват необработанных JS-ошибок и сбоев промисов в браузере клиента для админ-панели
    const sendErrorToBackend = (message: string, details?: string) => {
      const fingerprint = `${message}:${details || ""}`;
      if (reportedErrors.has(fingerprint) || reportedErrors.size >= 5) return;
      reportedErrors.add(fingerprint);

      fetch(`${API_BASE_URL}/api/analytics/client-error`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.slice(0, 480),
          details: details ? details.slice(0, 1900) : undefined,
          urlPath: window.location.pathname,
        }),
        keepalive: true,
      }).catch(() => {});
    };

    const onWindowError = (event: ErrorEvent) => {
      sendErrorToBackend(
        event.message || "JS Error",
        `${event.filename}:${event.lineno}:${event.colno}`
      );
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason =
        event.reason instanceof Error
          ? `${event.reason.message}\n${event.reason.stack}`
          : String(event.reason);
      sendErrorToBackend("Unhandled Promise Rejection", reason);
    };

    window.addEventListener("error", onWindowError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("error", onWindowError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      observer.disconnect();
    };
  }, []);

  if (!YM_ID) return null;

  return (
    <Script id="yandex-metrika" strategy="afterInteractive">
      {`
        (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
        m[i].l=1*new Date();
        for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
        k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
        (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

        ym(${Number(YM_ID)}, "init", {
          clickmap:true,
          trackLinks:true,
          accurateTrackBounce:true,
          webvisor:true
        });
      `}
    </Script>
  );
}