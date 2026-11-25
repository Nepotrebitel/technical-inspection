import type { Metadata } from "next";
import Link from "next/link";
import { Manrope, Playfair_Display } from "next/font/google";

const manrope = Manrope({ subsets: ["cyrillic", "latin"], weight: ["400", "500", "600", "700", "800"] });
const playfair = Playfair_Display({ subsets: ["cyrillic", "latin"], style: ["italic"], weight: ["600"] });

const SITE_URL = "https://xn----7sbaba2c5abgddg8b2a8j.xn--p1ai";
const PAGE_URL = `${SITE_URL}/pereoborudovanie`;

export const metadata: Metadata = {
  title: "Регистрация переоборудования ТС в ГИБДД в Ростове-на-Дону (ГБО, фаркоп) — ТЕХПЛЮС",
  description:
    "Помощь в оформлении внесения изменений в конструкцию автомобиля в Ростове-на-Дону, ул. Доватора, 271: установка ГБО, фаркопа, лебёдки, замена двигателя, спальник, КМУ. Обязательный техосмотр после переоборудования.",
  keywords: [
    "регистрация переоборудования ТС Ростов-на-Дону",
    "оформить ГБО в ГИБДД Ростов",
    "регистрация фаркопа в ГАИ Ростов",
    "внесение изменений в конструкцию авто Доватора 271",
    "техосмотр после переоборудования Ростов",
  ],
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "Регистрация переоборудования автомобилей в ГИБДД — ТЕХПЛЮС Ростов-на-Дону",
    description: "Сопровождение оформления ГБО, фаркопа, замены двигателя и других изменений конструкции ТС на ул. Доватора, 271.",
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
        { "@type": "ListItem", position: 2, name: "Переоборудование ТС", item: PAGE_URL },
      ],
    },
    {
      "@type": "Service",
      name: "Сопровождение регистрации внесения изменений в конструкцию ТС в ГИБДД",
      provider: { "@id": `${SITE_URL}/#organization` },
      areaServed: { "@type": "City", name: "Ростов-на-Дону" },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Нужно ли проходить техосмотр после установки ГБО или фаркопа?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Да, согласно законодательству РФ при внесении изменений в конструкцию транспортного средства прохождение технического осмотра в аккредитованном пункте (например, ТЕХПЛЮС, РСА № 16412) является обязательным этапом перед получением СКТС в ГИБДД.",
          },
        },
        {
          "@type": "Question",
          name: "Что будет, если не узаконить переоборудование после штрафа ГИБДД?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "После выписки штрафа 500 ₽ по ч. 1 ст. 12.5 КоАП даётся до 10 дней на устранение нарушения. При игнорировании предписания ГИБДД прекращает регистрацию автомобиля, а повторная езда грозит штрафом 5 000 ₽ или лишением прав до 3 месяцев.",
          },
        },
      ],
    },
  ],
};

export default function PereoborudovaniePage() {
  const changesList = [
    "Газобаллонное оборудование (ГБО)",
    "Тягово-сцепное устройство (фаркоп)",
    "Монтаж лебёдки и шноркеля",
    "Замена двигателя (другой тип или объём)",
    "Дополнительный топливный бак",
    "Гидроборт, КМУ, спальник над кабиной",
    "Пороги, бамперы, расширители арок",
    "Переоборудование в автодом или учебное ТС",
    "Изменение загрузочного пространства и перепланировка салона",
  ];

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
            <Link href="/osago" className="hover:text-[#151C2B] transition-colors">ОСАГО</Link>
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
          <span className="text-[#61403A]">Переоборудование ТС и регистрация в ГИБДД</span>
        </nav>

        <section className="bg-[#61403A] text-white rounded-[28px] sm:rounded-[40px] p-6 sm:p-10 md:p-14 shadow-2xl relative overflow-hidden">
          <div className="absolute -right-20 -bottom-20 w-72 h-72 rounded-full bg-[#8BBA82]/20 blur-3xl pointer-events-none" />
          <div className="max-w-3xl space-y-5 relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 text-[#8BBA82] text-xs font-extrabold uppercase tracking-wider border border-white/15">
              Сопровождение регистрации в ГАИ • Доватора, 271 (РСА № 16412)
            </div>

            <h1 className="text-[28px] sm:text-[42px] md:text-[54px] font-extrabold leading-[1.1] tracking-tight">
              Оформление{" "}
              <span className={`${playfair.className} text-[#8BBA82] font-semibold`}>переоборудования</span>{" "}
              автомобилей в Ростове-на-Дону
            </h1>

            <p className="text-white/85 text-[15px] sm:text-lg font-medium leading-relaxed">
              Помогаем легализовать внесение изменений в конструкцию транспортного средства (ГБО, фаркоп, замена двигателя, спецнадстройки) и проводим обязательный технический осмотр после переоборудования в аккредитованном пункте рядом с МРЭО.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <Link
                href="/#booking"
                className="px-7 py-4 rounded-full bg-[#8BBA82] hover:bg-[#77a66f] text-white font-extrabold text-center text-sm sm:text-base shadow-md transition-all"
              >
                Записаться на консультацию и ТО
              </Link>
              <a
                href="tel:+79882556547"
                className="px-7 py-4 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-extrabold text-center text-sm sm:text-base transition-colors"
              >
                Позвонить: +7 (988) 255-65-47
              </a>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-[28px] p-6 sm:p-9 border border-[#E8EBE8] space-y-4">
            <h2 className="text-2xl font-extrabold text-[#61403A]">Какие изменения нужно регистрировать</h2>
            <div className="flex flex-wrap gap-2">
              {changesList.map((item) => (
                <span
                  key={item}
                  className="px-3.5 py-2 rounded-xl bg-[#F8F9F7] border border-[#E8EBE8] text-xs sm:text-sm font-semibold text-[#151C2B]"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-[28px] p-6 sm:p-9 border border-[#E8EBE8] space-y-4">
            <h2 className="text-2xl font-extrabold text-[#61403A]">Последствия езды без регистрации</h2>
            <div className="p-4 rounded-2xl bg-red-50/70 border border-red-200 space-y-1">
              <div className="text-xs font-extrabold uppercase text-red-700">1. Предписание до 10 дней (ч. 1 ст. 12.5 КоАП)</div>
              <p className="text-sm text-[#151C2B]/90">
                Штраф <strong>500 ₽</strong> и требование в течение 10 дней демонтировать оборудование или узаконить изменения.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-[#61403A] text-white space-y-1">
              <div className="text-xs font-extrabold uppercase text-red-300">2. Прекращение регистрации (ст. 12.1 КоАП)</div>
              <p className="text-sm text-white/90">
                При игнорировании предписания ГАИ аннулирует учёт ТС. Повторная остановка грозит штрафом <strong>5 000 ₽</strong> или лишением прав до <strong>3 месяцев</strong>.
              </p>
            </div>
          </div>
        </section>

        <footer className="bg-white rounded-[24px] p-6 border border-[#E8EBE8] flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs sm:text-sm font-bold text-[#657080]">
            ООО «ТЕХПЛЮС» • <span className="text-[#151C2B]">г. Ростов-на-Дону, ул. Доватора, зд. 271, стр. 1</span>
          </div>
          <div className="flex flex-wrap gap-4 text-xs sm:text-sm font-extrabold text-[#5B8E52]">
            <Link href="/" className="hover:underline">← Техосмотр (ЕАИСТО)</Link>
            <Link href="/dublikaty-gosnomerov" className="hover:underline">Дубликаты госномеров</Link>
            <Link href="/osago" className="hover:underline">ОСАГО</Link>
          </div>
        </footer>
      </div>
    </main>
  );
}