import type { Metadata } from "next";
import Link from "next/link";
import { Manrope, Playfair_Display } from "next/font/google";

const manrope = Manrope({ subsets: ["cyrillic", "latin"], weight: ["400", "500", "600", "700", "800"] });
const playfair = Playfair_Display({ subsets: ["cyrillic", "latin"], style: ["italic"], weight: ["600"] });

const SITE_URL = "https://xn----7sbaba2c5abgddg8b2a8j.xn--p1ai";
const PAGE_URL = `${SITE_URL}/dublikaty-gosnomerov`;

export const metadata: Metadata = {
  title: "Дубликаты госномеров в Ростове-на-Дону на Доватора 271 — изготовление за 2 минуты (ГОСТ)",
  description:
    "Срочное изготовление дубликатов государственных регистрационных знаков по ГОСТ Р 50577-2018 в Ростове-на-Дону, ул. Доватора, 271 (175 м от МРЭО ГИБДД). Стандартные, квадратные тип 1А, на прицепы и мото за 1–2 минуты.",
  keywords: [
    "дубликаты госномеров Ростов-на-Дону",
    "изготовление госномеров Доватора 271",
    "квадратные номера тип 1А Ростов",
    "сделать дубликат номера авто у МРЭО Ростов",
    "дубликат госзнака на мотоцикл и прицеп Ростов",
  ],
  alternates: { canonical: PAGE_URL },
  openGraph: {
    title: "Дубликаты госномеров по ГОСТ за 2 минуты — ТЕХПЛЮС Ростов-на-Дону",
    description: "Изготовление любых форматов госномеров у МРЭО на ул. Доватора, 271. Защита от штрафов по ст. 12.2 КоАП РФ.",
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
        { "@type": "ListItem", position: 2, name: "Дубликаты госномеров", item: PAGE_URL },
      ],
    },
    {
      "@type": "Service",
      name: "Изготовление дубликатов государственных регистрационных знаков по ГОСТ Р 50577-2018",
      provider: { "@id": `${SITE_URL}/#organization` },
      areaServed: { "@type": "City", name: "Ростов-на-Дону" },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Сколько времени занимает изготовление дубликата госномера?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Изготовление одной пластины или комплекта из двух знаков занимает 1–2 минуты прямо при вас в пункте ТЕХПЛЮС на ул. Доватора, 271.",
          },
        },
        {
          "@type": "Question",
          name: "Какие документы нужны для заказа дубликатов номеров?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Достаточно предъявить свидетельство о регистрации ТС (СТС) или ПТС/ЭПТС и документ, удостоверяющий личность (паспорт или водительское удостоверение).",
          },
        },
        {
          "@type": "Question",
          name: "Законны ли квадратные номера (тип 1А) спереди и сзади?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Да, согласно действующей редакции ГОСТ Р 50577-2018 установка двухстрочных знаков типа 1А разрешена как на заднюю, так и на переднюю площадку автомобиля с нестандартным местом крепления.",
          },
        },
      ],
    },
  ],
};

export default function DublikatyGosnomerovPage() {
  const plateTypes = [
    {
      badge: "Тип 1 • Стандарт",
      title: "Прямоугольные автономера (520×112 мм)",
      desc: "Классические однострочные знаки для легковых и грузовых автомобилей со световозвращающим покрытием, голограммами и штампом завода-изготовителя.",
    },
    {
      badge: "Тип 1А • Японские и США",
      title: "Квадратные госномера (290×170 мм)",
      desc: "Двухстрочные знаки для автомобилей с нестандартным креплением — официально разрешены ГОСТ Р 50577-2018 для установки спереди и сзади.",
    },
    {
      badge: "Тип 2 и Тип 4",
      title: "Знаки на прицепы и мотоциклы",
      desc: "Изготовление регистрационных пластин для прицепов, полуприцепов, мотоциклов, квадроциклов и спецтехники.",
    },
    {
      badge: "Без флага / с триколором",
      title: "Любые варианты исполнения",
      desc: "Выпускаем дубликаты взамен утерянных, украденных, погнутых после ДТП или выцветших номеров без перерегистрации авто в ГИБДД.",
    },
  ];

  const plateFaqs = [
    {
      q: "Сколько времени занимает изготовление дубликата госномера?",
      a: "Всего 1–2 минуты прямо при вас в пункте ТЕХПЛЮС на ул. Доватора, зд. 271, стр. 1 (175 метров от МРЭО ГИБДД).",
    },
    {
      q: "Какие документы нужны для заказа дубликатов?",
      a: "Понадобится свидетельство о регистрации ТС (СТС) или ПТС/ЭПТС, а также паспорт или водительское удостоверение.",
    },
    {
      q: "Законны ли квадратные номера (тип 1А) спереди и сзади?",
      a: "Да, по ГОСТ Р 50577-2018 установка двухстрочных номеров типа 1А разрешена как на заднюю, так и на переднюю площадку автомобиля.",
    },
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
            <Link href="/osago" className="hover:text-[#151C2B] transition-colors">ОСАГО</Link>
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
          <span className="text-[#61403A]">Дубликаты госномеров в Ростове-на-Дону</span>
        </nav>

        <section className="bg-white rounded-[28px] sm:rounded-[40px] p-6 sm:p-10 md:p-14 border border-[#E8EBE8] shadow-lg relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-[#8BBA82]/15 blur-3xl pointer-events-none" />
          <div className="max-w-3xl space-y-5 relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EEF3ED] text-[#5B8E52] text-xs font-extrabold uppercase tracking-wider">
              ГОСТ Р 50577-2018 • 175 метров от МРЭО ГИБДД (ЗЖМ)
            </div>

            <h1 className="text-[28px] sm:text-[42px] md:text-[54px] font-extrabold text-[#61403A] leading-[1.1] tracking-tight">
              Изготовление дубликатов{" "}
              <span className={`${playfair.className} text-[#8BBA82] font-semibold`}>госномеров</span>{" "}
              в Ростове-на-Дону за 2 минуты
            </h1>

            <p className="text-[#657080] text-[15px] sm:text-lg font-medium leading-relaxed">
              Официальное изготовление регистрационных знаков в Советском районе Ростова-на-Дону (ул. Доватора, зд. 271, стр. 1). Делаем стандартные, квадратные (тип 1А), мото- и прицепные номера сразу на месте — без очередей и переплат.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <Link
                href="/#booking"
                className="px-7 py-4 rounded-full bg-[#8BBA82] hover:bg-[#77a66f] text-white font-extrabold text-center text-sm sm:text-base shadow-md transition-all"
              >
                Записаться на визит онлайн
              </Link>
              <a
                href="tel:+79882556547"
                className="px-7 py-4 rounded-full bg-[#F8F9F7] hover:bg-[#EEF3ED] border border-[#E8EBE8] text-[#61403A] font-extrabold text-center text-sm sm:text-base transition-colors"
              >
                Позвонить: +7 (988) 255-65-47
              </a>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {plateTypes.map((item) => (
            <div key={item.title} className="bg-white rounded-[24px] p-6 sm:p-8 border border-[#E8EBE8] shadow-sm space-y-3">
              <span className="inline-block px-3 py-1 rounded-full bg-[#EEF3ED] text-[#5B8E52] text-xs font-extrabold">
                {item.badge}
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#61403A]">{item.title}</h2>
              <p className="text-sm sm:text-[15px] text-[#657080] font-medium leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#61403A] text-white rounded-[28px] p-6 sm:p-9 space-y-4 shadow-xl">
            <h2 className="text-2xl font-extrabold">Штрафы за стёртые и нечитаемые знаки (ст. 12.2 КоАП РФ)</h2>
            <div className="bg-white/10 p-4 rounded-2xl border border-white/15">
              <div className="text-xs font-extrabold uppercase text-[#8BBA82] mb-1">ч. 1 ст. 12.2 КоАП • Штраф 500 ₽</div>
              <p className="text-sm text-white/90">
                Если краска сошла естественным путём или после ДТП, но символы остаются узнаваемыми — предупреждение или штраф водителю ТС <strong>500 ₽</strong>.
              </p>
            </div>
            <div className="bg-white/10 p-4 rounded-2xl border border-red-400/40">
              <div className="text-xs font-extrabold uppercase text-red-300 mb-1">ч. 2 ст. 12.2 КоАП • 5 000 ₽ или лишение прав</div>
              <p className="text-sm text-white/90">
                Если из-за потёртости один символ похож на другой (например, «О» на «С») — штраф <strong>5 000 ₽</strong> или лишение водительских прав на <strong>1–3 месяца</strong>.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-[28px] p-6 sm:p-9 border border-[#E8EBE8] space-y-4">
            <h2 className="text-2xl font-extrabold text-[#61403A]">Частые вопросы по дубликатам номеров</h2>
            <div className="space-y-3">
              {plateFaqs.map((f) => (
                <div key={f.q} className="p-4 rounded-2xl bg-[#F8F9F7] border border-[#E8EBE8]">
                  <h3 className="font-extrabold text-[#151C2B] text-sm sm:text-base">{f.q}</h3>
                  <p className="text-xs sm:text-sm text-[#657080] mt-1 leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="bg-white rounded-[24px] p-6 border border-[#E8EBE8] flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs sm:text-sm font-bold text-[#657080]">
            ООО «ТЕХПЛЮС» • <span className="text-[#151C2B]">г. Ростов-на-Дону, ул. Доватора, зд. 271, стр. 1</span>
          </div>
          <div className="flex flex-wrap gap-4 text-xs sm:text-sm font-extrabold text-[#5B8E52]">
            <Link href="/" className="hover:underline">← Техосмотр (ЕАИСТО)</Link>
            <Link href="/osago" className="hover:underline">ОСАГО</Link>
            <Link href="/pereoborudovanie" className="hover:underline">Переоборудование</Link>
          </div>
        </footer>
      </div>
    </main>
  );
}