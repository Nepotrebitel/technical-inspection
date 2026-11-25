import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { SiteAnalytics } from "@/components/SiteAnalytics";

const manrope = Manrope({
  subsets: ["cyrillic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const SITE_URL = "https://xn----7sbaba2c5abgddg8b2a8j.xn--p1ai";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "ТЕХПЛЮС — Официальный техосмотр в Ростове-на-Дону на Доватора 271 (РСА № 16412)",
  description:
    "Аккредитованный пункт техосмотра ТЕХПЛЮС в Ростове-на-Дону, ул. Доватора, зд. 271 (175 метров до МРЭО ГИБДД). Диагностическая карта ЕАИСТО за 30 минут, ОСАГО, дубликаты госномеров по ГОСТ, переоборудование ТС.",
  keywords: [
    "техосмотр Ростов-на-Дону",
    "техосмотр Доватора 271",
    "техосмотр у МРЭО Ростов",
    "диагностическая карта ЕАИСТО Ростов",
    "пункт технического осмотра РСА 16412",
    "дубликаты госномеров Ростов-на-Дону",
    "оформить ОСАГО Ростов Доватора",
    "переоборудование ТС регистрация ГИБДД Ростов",
  ],
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: SITE_URL,
    siteName: "ТЕХПЛЮС — Пункт технического осмотра",
    title: "ТЕХПЛЮС — Официальный техосмотр в Ростове-на-Дону (РСА № 16412)",
    description:
      "Официальный пункт ТО у МРЭО на ул. Доватора, 271. Диагностическая карта ЕАИСТО за 30 минут, изготовление госномеров за 2 минуты и ОСАГО.",
    images: [
      {
        url: "/hero.png",
        width: 1200,
        height: 630,
        alt: "Пункт техосмотра ТЕХПЛЮС в Ростове-на-Дону, ул. Доватора 271",
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
  },
};

const jsonLdSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "AutomotiveBusiness",
      "@id": `${SITE_URL}/#organization`,
      name: "ТЕХПЛЮС — Официальный пункт техосмотра (РСА № 16412)",
      legalName: "ООО «ТЕХПЛЮС»",
      url: SITE_URL,
      logo: `${SITE_URL}/hero.png`,
      image: `${SITE_URL}/hero.png`,
      telephone: "+7-988-255-65-47",
      email: "tekhplus@yandex.ru",
      priceRange: "₽₽",
      address: {
        "@type": "PostalAddress",
        postalCode: "344090",
        addressCountry: "RU",
        addressRegion: "Ростовская область",
        addressLocality: "Ростов-на-Дону",
        streetAddress: "ул. Доватора, зд. 271, стр. 1",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: 47.2356,
        longitude: 39.6184,
      },
      openingHoursSpecification: [
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
          opens: "08:00",
          closes: "18:00",
        },
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: "Sunday",
          opens: "09:00",
          closes: "17:00",
        },
      ],
      areaServed: {
        "@type": "City",
        name: "Ростов-на-Дону",
      },
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Услуги пункта техосмотра ТЕХПЛЮС",
        itemListElement: [
          {
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              name: "Технический осмотр категорий L, M1, N1 с внесением в ЕАИСТО",
            },
          },
          {
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              name: "Изготовление дубликатов государственных регистрационных знаков по ГОСТ Р 50577-2018",
            },
          },
          {
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              name: "Оформление полисов ОСАГО и Е-ОСАГО",
            },
          },
          {
            "@type": "Offer",
            itemOffered: {
              "@type": "Service",
              name: "Сопровождение регистрации переоборудования ТС в ГИБДД (ГБО, фаркоп, замена двигателя)",
            },
          },
        ],
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Нужны ли аптечка, огнетушитель и знак аварийной остановки для техосмотра?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Технический эксперт проверяет автомобиль по установленному перечню параметров. Наличие аптечки, огнетушителя и знака аварийной остановки при прохождении ТО не проверяется.",
          },
        },
        {
          "@type": "Question",
          name: "Обязательна ли предварительная запись на техосмотр?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Нет, запись не обязательна. Пункт ТЕХПЛЮС на ул. Доватора, 271 принимает автомобили в любое удобное время в порядке живой очереди или по онлайн-брони.",
          },
        },
        {
          "@type": "Question",
          name: "Какие документы нужны для прохождения техосмотра?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Понадобятся только два документа: паспорт или водительское удостоверение, а также СТС или ПТС/ЭПТС на транспортное средство.",
          },
        },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${manrope.className} h-full antialiased`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSchema) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#F8F9F7] text-[#151C2B]">
        {children}
        <SiteAnalytics />
      </body>
    </html>
  );
}