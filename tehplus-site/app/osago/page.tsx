import type { Metadata } from "next";
import Link from "next/link";
import { Manrope, Playfair_Display } from "next/font/google";

const manrope = Manrope({ subsets: ["cyrillic", "latin"], weight: ["400", "500", "600", "700", "800"] });
const playfair = Playfair_Display({ subsets: ["cyrillic", "latin"], style: ["italic"], weight: ["600"] });

const SITE_URL = "https://xn----7sbaba2c5abgddg8b2a8j.xn--p1ai";
const PAGE_URL = `${SITE_URL}/osago`;

export const metadata: Metadata = {
  title: "Оформление ОСАГО и Е-ОСАГО у МРЭО в Ростове-на-Дону на Доватора 271 — ТЕХПЛЮС",
  description:
    "Быстрое оформление полиса ОСАГО и Е-ОСАГО в Ростове-на-Дону, ул. Доватора, 271 (175 метров до МРЭО ГИБДД). Сравнение тарифов ведущих страховых компаний с сохранением КБМ без переплат.",
  keywords: [
    "оформить ОСАГО Ростов-на-Дону",
    "ОСАГО у МРЭО Доватора 271",
    "Е-ОСАГО для постановки на учет Ростов",
    "страховка авто рядом с ГИБДД Ростов",
  ],
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "Оформление ОСАГО у МРЭО на Доватора 271 — ТЕХПЛЮС Ростов-на-Дону",
    description: "Оформите полис ОСАГО и пройдите техосмотр в одном месте за 30 минут перед регистрацией авто в ГИБДД.",
    url: PAGE_URL,
    type: "website",
  },
};

const pageSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Главная — Техосмотр ТЕХПЛЮС", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Оформление ОСАГО", item: PAGE_URL },
      ],
    },
    {
      "@type": "Service",
      name: "Оформление страховых полисов ОСАГО и Е-ОСАГО у МРЭО",
      provider: { "@id": `${SITE_URL}/#organization` },
      areaServed: { "@type": "City", name: "Ростов-на-Дону" },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Нужен ли полис ОСАГО при постановке автомобиля на учёт в МРЭО ГИБДД?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "С 1 марта 2025 года предъявлять полис ОСАГО при регистрации автомобиля в ГИБДД не требуется, однако выезд на дороги общего пользования без действующего полиса ОСАГО запрещён и карается штрафом по ст. 12.37 КоАП РФ.",
          },
        },
        {
          "@type": "Question",
          name: "Сохраняется ли скидка КБМ при оформлении ОСАГО у вас?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Да, расчёт выполняется по официальной базе НСИС (АИС Страхование) с полным сохранением вашего коэффициента бонус-малус (КБМ).",
          },
        },
      ],
    },
  ],
};

export default function OsagoPage() {
  return (
    <main className={`min-h-screen bg-[#F8F9F7] text-[#151C2B] relative overflow-x-hidden ${manrope.className}`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema) }} />

      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8BBA8220_1px,transparent_1px),linear-gradient(to_bottom,#8BBA8220_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-[#8BBA82] to-[#EEF3ED] opacity-50 blur-[90px]" />
      </div>

      <header className="relative z-10 max-w-[1320px] mx-auto px-4 sm:px-6 md:px-12 pt-6">
        <div className="bg-white/90 backdrop-blur-xl border border-[#E8EBE8] rounded-full px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 shadow-sm">
          <Link href="/" className="text-lg sm:text-xl font-extrabold text-[#61403A] flex items-center gap-1.5">
            ТЕХПЛЮС<span className="w-2 h-2 rounded-full bg-[#8BBA82] inline-block" />
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-bold text-[#657080]">
            <Link href="/" className="hover:text-[#151C2B] transition-colors">Техосмотр (РСА № 16412)</Link>
            <Link href="/dublikaty-gosnomerov" className="hover:text-[#151C2B] transition-colors">Госномера</Link>
            <Link href="/pereoborudovanie" className="hover:text-[#151C2B] transition-colors">Переоборудование</Link>
          </nav>

          <div className="flex items-center gap-2">
            <a
              href="tel:+79882556547"
              className="px-4 py-2 rounded-full bg-[#F8F9F7] border border-[#E8EBE8] text-xs sm:text-sm font-extrabold text-[#151C2B] hover:bg-[#EEF3ED] transition-colors"
            >
              +7 (988) 255-65-47
            </a>
            <Link
              href="/#booking"
              className="px-4 py-2 rounded-full bg-[#8BBA82] hover:bg-[#77a66f] text-white text-xs sm:text-sm font-extrabold transition-colors"
            >
              Записаться
            </Link>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-[1320px] mx-auto px-4 sm:px-6 md:px-12 py-10 sm:py-16 space-y-10">
        <nav aria-label="Хлебные крошки" className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#657080]">
          <Link href="/" className="hover:text-[#61403A]">Главная (Техосмотр)</Link>
          <span>/</span>
          <span className="text-[#61403A]">Оформление ОСАГО и Е-ОСАГО</span>
        </nav>

        <section className="bg-white rounded-[28px] sm:rounded-[40px] p-6 sm:p-10 md:p-14 border border-[#E8EBE8] shadow-lg relative overflow-hidden">
          <div className="max-w-3xl space-y-5 relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EEF3ED] text-[#5B8E52] text-xs font-extrabold uppercase tracking-wider">
              Без переплат • 175 метров до МРЭО ГИБДД (Доватора, 271)
            </div>

            <h1 className="text-[28px] sm:text-[42px] md:text-[54px] font-extrabold text-[#61403A] leading-[1.1] tracking-tight">
              Оформление{" "}
              <span className={`${playfair.className} text-[#8BBA82] font-semibold`}>ОСАГО</span>{" "}
              в Ростове-на-Дону на Доватора, 271
            </h1>

            <p className="text-[#657080] text-[15px] sm:text-lg font-medium leading-relaxed">
              Подберём и оформим страховой полис Е-ОСАГО или на бумажном бланке прямо во время прохождения техосмотра. Сравним предложения ведущих страховых компаний с учётом вашего КБМ, чтобы вы могли спокойно выехать из МРЭО на законных основаниях.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <Link
                href="/#booking"
                className="px-7 py-4 rounded-full bg-[#8BBA82] hover:bg-[#77a66f] text-white font-extrabold text-center text-sm sm:text-base shadow-md transition-all"
              >
                Записаться на ТО и ОСАГО
              </Link>
              <a
                href="tel:+79882556547"
                className="px-7 py-4 rounded-full bg-[#F8F9F7] hover:bg-[#EEF3ED] border border-[#E8EBE8] text-[#61403A] font-extrabold text-center text-sm sm:text-base transition-colors"
              >
                Рассчитать по телефону: +7 (988) 255-65-47
              </a>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white rounded-[24px] p-6 sm:p-8 border border-[#E8EBE8] shadow-sm space-y-2.5">
            <div className="text-xs font-extrabold uppercase text-[#8BBA82]">Выгода и прозрачность</div>
            <h2 className="text-xl font-extrabold text-[#61403A]">Сравнение страховых</h2>
            <p className="text-sm text-[#657080] leading-relaxed">
              Проверяем расчёт сразу по нескольким надёжным страховым компаниям и сохраняем вашу скидку за безаварийную езду (КБМ).
            </p>
          </div>

          <div className="bg-white rounded-[24px] p-6 sm:p-8 border border-[#E8EBE8] shadow-sm space-y-2.5">
            <div className="text-xs font-extrabold uppercase text-[#8BBA82]">Всё в одном месте</div>
            <h2 className="text-xl font-extrabold text-[#61403A]">ТО + ОСАГО + Номера</h2>
            <p className="text-sm text-[#657080] leading-relaxed">
              За 30 минут вы получаете диагностическую карту ЕАИСТО, полис ОСАГО и при необходимости дубликаты госномеров по ГОСТ.
            </p>
          </div>

          <div className="bg-[#61403A] text-white rounded-[24px] p-6 sm:p-8 shadow-lg space-y-2.5">
            <div className="text-xs font-extrabold uppercase text-[#8BBA82]">Защита от регресса</div>
            <h2 className="text-xl font-extrabold">Без риска по ст. 14 ФЗ-40</h2>
            <p className="text-sm text-white/85 leading-relaxed">
              Для такси, автобусов и грузовых ТС действующая диагностическая карта защищает от регрессного требования страховой компании после ДТП.
            </p>
          </div>
        </section>

        <footer className="bg-white rounded-[24px] p-6 border border-[#E8EBE8] flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs sm:text-sm font-bold text-[#657080]">
            ООО «ТЕХПЛЮС» • <span className="text-[#151C2B]">г. Ростов-на-Дону, ул. Доватора, зд. 271, стр. 1</span>
          </div>
          <div className="flex flex-wrap gap-4 text-xs sm:text-sm font-extrabold text-[#5B8E52]">
            <Link href="/" className="hover:underline">← Техосмотр (ЕАИСТО)</Link>
            <Link href="/dublikaty-gosnomerov" className="hover:underline">Дубликаты госномеров</Link>
            <Link href="/pereoborudovanie" className="hover:underline">Переоборудование</Link>
          </div>
        </footer>
      </div>
    </main>
  );
}