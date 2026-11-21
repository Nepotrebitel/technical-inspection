"use client";

import Script from "next/script";

const YM_ID = process.env.NEXT_PUBLIC_YM_ID;

// Вспомогательная функция для отправки целей из любого места сайта
export function trackGoal(goalName: string, params?: Record<string, unknown>) {
  if (typeof window !== "undefined" && YM_ID && typeof (window as unknown as { ym?: (...args: unknown[]) => void }).ym === "function") {
    (window as unknown as { ym: (id: number, action: string, target: string, params?: Record<string, unknown>) => void }).ym(
      Number(YM_ID),
      "reachGoal",
      goalName,
      params
    );
  }
}

export function YandexMetrika() {
  if (!YM_ID) return null;

  return (
    <>
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
      <noscript>
        <div>
          <img
            src={`https://mc.yandex.ru/watch/${YM_ID}`}
            style={{ position: "absolute", left: "-9999px" }}
            alt=""
          />
        </div>
      </noscript>
    </>
  );
}