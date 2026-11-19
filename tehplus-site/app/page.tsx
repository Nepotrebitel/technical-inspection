"use client";
import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Manrope, Playfair_Display } from 'next/font/google';

import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ru } from "date-fns/locale";
import { motion, useMotionValue, useSpring, useTransform, Variants } from "framer-motion";

import { LiquidGlassFilter, LiquidGlassLayer, LiquidButton } from "@/components/ui/liquid-glass";

registerLocale("ru", ru);

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

const ALLOWED_CATEGORIES = [
  "L Мотоциклы",
  "M1 Легковые автомобили",
  "N1 Грузовики (до 3,5т)",
] as const;

type VehicleCategory = (typeof ALLOWED_CATEGORIES)[number];

const manrope = Manrope({ subsets: ['cyrillic', 'latin'], weight: ['400', '500', '600', '700', '800'] });
const playfair = Playfair_Display({ subsets: ['cyrillic', 'latin'], style: ['italic'], weight: ['600'] });

const fadeInLeft: Variants = { hidden: { opacity: 0, x: -50 }, visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: "easeOut" } } };
const fadeInRight: Variants = { hidden: { opacity: 0, x: 50 }, visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: "easeOut" } } };
const fadeInUp: Variants = { hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" } } };
const zoomIn: Variants = { hidden: { opacity: 0, scale: 0.95 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: "easeOut" } } };
const staggerContainer: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.12 } } };

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isSameDay(a: Date | null, b: Date): boolean {
  if (!a) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// === 3D МАГНИТНЫЕ КАРТОЧКИ ===
const TiltCard = ({ children, className }: { children: React.ReactNode; className?: string }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 20 });
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["6deg", "-6deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-6deg", "6deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div variants={fadeInUp} style={{ perspective: 1200 }} className="w-full h-full">
      <motion.div
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className={`w-full h-full relative cursor-default ${className}`}
      >
        <div style={{ transform: "translateZ(20px)", transformStyle: "preserve-3d" }} className="w-full h-full">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default function Home() {
  const [formData, setFormData] = useState<{
    carNumber: string;
    phone: string;
    category: VehicleCategory;
    date: Date | null;
    time: string;
  }>({
    carNumber: '',
    phone: '',
    category: 'M1 Легковые автомобили',
    date: null,
    time: '',
  });

  const [status, setStatus] = useState<{ type: 'idle' | 'error' | 'success' | 'loading'; text: string }>({ type: 'idle', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  const [openService, setOpenService] = useState<number | null>(null);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMandatoryOpen, setIsMandatoryOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const [today] = useState(() => new Date());
  const quickDates = useMemo(() => {
    const d1 = new Date(today);
    const d2 = new Date(today);
    d2.setDate(d2.getDate() + 1);
    const d3 = new Date(today);
    d3.setDate(d3.getDate() + 2);
    return [
      { label: "Сегодня", date: d1 },
      { label: "Завтра", date: d2 },
      { label: "Послезавтра", date: d3 },
    ];
  }, [today]);

 const galleryPhotos = [
  { src: "/photo/ph-1.jpeg", title: "Линия осмотра" },
  { src: "/photo/ph-2.jpeg", title: "Диагностика ходовой" },
  { src: "/photo/ph-3.jpeg", title: "Проверка оптики" },
  { src: "/photo/ph-4.jpeg", title: "Пункт ТЕХПЛЮС" },
  { src: "/photo/ph-5.jpeg", title: "Зона ожидания" }, 
];

  const handleNext = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % galleryPhotos.length);
  };

  const handlePrev = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + galleryPhotos.length) % galleryPhotos.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) handleNext();
      else handlePrev();
    }
    setTouchStartX(null);
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname);
  }, []);

  // Загрузка занятых слотов с бэкенда при выборе даты
  useEffect(() => {
    if (!formData.date) {
      setBookedSlots([]);
      return;
    }

    const controller = new AbortController();
    const dateStr = formatLocalDate(formData.date);

    const fetchBookedSlots = async () => {
      setIsLoadingSlots(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/slots?date=${encodeURIComponent(dateStr)}`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.bookedSlots)) {
            setBookedSlots(data.bookedSlots.filter((s: unknown): s is string => typeof s === "string"));
          } else {
            setBookedSlots([]);
          }
        } else {
          setBookedSlots([]);
        }
      } catch (err: unknown) {
        if ((err as Error)?.name !== "AbortError") {
          setBookedSlots([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingSlots(false);
        }
      }
    };

    fetchBookedSlots();
    return () => controller.abort();
  }, [formData.date]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === "category") {
      if (ALLOWED_CATEGORIES.includes(value as VehicleCategory)) {
        setFormData((prev) => ({ ...prev, category: value as VehicleCategory }));
      }
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectDate = (date: Date | null) => {
    setFormData((prev) => ({ ...prev, date, time: '' }));
  };

  // Генерация слотов с отсечением прошедшего времени на сегодня (+30 мин буфер), Вс с 9:00
  const availableSlots = useMemo(() => {
    if (!formData.date) return [];

    const now = new Date();
    const isToday = isSameDay(formData.date, now);
    const currentMinutesWithBuffer = now.getHours() * 60 + now.getMinutes() + 30;

    const dayOfWeek = formData.date.getDay();
    const startHour = dayOfWeek === 0 ? 9 : 8;
    const endHour = dayOfWeek === 0 ? 17 : 18;

    const slots: { time: string; isBooked: boolean }[] = [];
    for (let h = startHour; h < endHour; h++) {
      for (const m of [0, 30]) {
        const slotTotalMinutes = h * 60 + m;
        if (isToday && slotTotalMinutes < currentMinutesWithBuffer) {
          continue;
        }
        const timeStr = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
        slots.push({
          time: timeStr,
          isBooked: bookedSlots.includes(timeStr),
        });
      }
    }
    return slots;
  }, [formData.date, bookedSlots]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!formData.date || !formData.time) {
      setStatus({ type: 'error', text: 'Пожалуйста, выберите дату и время визита.' });
      return;
    }

    if (!availableSlots.some((s) => s.time === formData.time && !s.isBooked)) {
      setStatus({ type: 'error', text: 'Выбранное время уже недоступно. Пожалуйста, выберите другой слот.' });
      setFormData((prev) => ({ ...prev, time: '' }));
      return;
    }

    if (!ALLOWED_CATEGORIES.includes(formData.category)) {
      setStatus({ type: 'error', text: 'Некорректная категория транспортного средства.' });
      return;
    }

    const cleanedNumber = formData.carNumber.replace(/[^А-ЯA-Z0-9]/gi, '').toUpperCase();
    const validLetters = 'АВЕКМНОРСТУХABEKMHOPCTYX';
    let isNumberValid = false;

    if (formData.category === 'L Мотоциклы') {
      isNumberValid = new RegExp(`^\\d{4}[${validLetters}]{2}\\d{2,3}$`).test(cleanedNumber);
    } else {
      isNumberValid = new RegExp(`^[${validLetters}]\\d{3}[${validLetters}]{2}\\d{2,3}$`).test(cleanedNumber);
    }

    if (!isNumberValid) {
      setStatus({
        type: 'error',
        text: formData.category === 'L Мотоциклы'
          ? 'Неверный госномер мотоцикла. Пример: 1234 АА 161'
          : 'Неверный госномер. Пример: А 123 АА 161',
      });
      return;
    }

    const digitsOnly = formData.phone.replace(/\D/g, '');
    if (digitsOnly.length < 10 || digitsOnly.length > 12) {
      setStatus({ type: 'error', text: 'Введите корректный номер телефона (минимум 10 цифр).' });
      return;
    }
    const normalizedPhone = digitsOnly.length === 10
      ? `+7${digitsOnly}`
      : digitsOnly.startsWith('8') && digitsOnly.length === 11
      ? `+7${digitsOnly.slice(1)}`
      : `+${digitsOnly}`;

    const formattedDate = formatLocalDate(formData.date);

    setIsSubmitting(true);
    setStatus({ type: 'loading', text: 'Отправка заявки...' });

    try {
      const response = await fetch(`${API_BASE_URL}/api/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          carNumber: cleanedNumber,
          phone: normalizedPhone,
          category: formData.category,
          date: formattedDate,
          time: formData.time,
        }),
      });

      if (response.ok) {
        setStatus({ type: 'success', text: 'Заявка успешно отправлена! Талон активирован — ждём вас.' });
        setBookedSlots((prev) => [...prev, formData.time]);
        setFormData((prev) => ({ carNumber: '', phone: '', category: prev.category, date: prev.date, time: '' }));
      } else if (response.status === 409) {
        setStatus({ type: 'error', text: 'Выбранное время уже занято. Пожалуйста, выберите другой слот.' });
        setBookedSlots((prev) => [...prev, formData.time]);
        setFormData((prev) => ({ ...prev, time: '' }));
      } else {
        setStatus({ type: 'error', text: 'Произошла ошибка при сохранении. Проверьте введённые данные.' });
      }
    } catch {
      setStatus({ type: 'error', text: 'Ошибка соединения с сервером. Попробуйте позже или позвоните нам.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Разбор введённого номера для красивого отображения на электронном талоне
  const ticketPlate = useMemo(() => {
    const raw = formData.carNumber.replace(/[^А-ЯA-Z0-9]/gi, '').toUpperCase();
    if (!raw) {
      return { main: "А 123 АА", region: "161", isPlaceholder: true };
    }
    const match = raw.match(/^([А-ЯA-Z0-9]{6})(\d{2,3})$/);
    if (match) {
      const base = match[1];
      const formattedBase = `${base[0]} ${base.slice(1, 4)} ${base.slice(4, 6)}`;
      return { main: formattedBase, region: match[2], isPlaceholder: false };
    }
    return { main: raw.slice(0, 6), region: raw.slice(6, 9) || "161", isPlaceholder: false };
  }, [formData.carNumber]);

  const mandatoryList = [
    "Если автомобиль используется в служебных целях или оформлен на юридическое лицо",
    "Автомобиль оформлен на физлицо, но используется в коммерческих целях (например, в бизнесе для доставки товаров)",
    "При постановке на учёт автомобиля старше 4 лет (часто при покупке подержанного авто)",
    "При внесении изменений в конструкцию авто (установка фаркопа, газового оборудования (ГБО), замена двигателя и другие изменения)",
    "Грузовые автомобили категории B до 3,5 тонн (например, Газель)",
    "Легковые такси, автобусы, грузовые авто свыше 3,5 тонн и прицепы к ним",
    "Учебные автомобили, а также транспортные средства для перевозки опасных грузов и прицепы к ним",
    "При выезде за границу (могут потребовать наличие пройденного ТО — рекомендуем уточнять заранее перед поездкой)",
  ];

  const faqs = [
    { q: "Нужны ли аптечка, огнетушитель и знак?", a: "Технический эксперт проверяет машину по списку из 55 параметров. Наличие аптечки, огнетушителя и знака в этом списке нет." },
    { q: "Обязательна ли запись?", a: "Нет, запись не является обязательной. Можем Вас принять в порядке живой очереди." },
    { q: "Можно ли оплатить услуги банковской картой?", a: "Да, мы принимаем оплату наличными, картами любых банков и по QR-коду (СБП). Для юрлиц доступна оплата по счету." },
    { q: "Нужно ли мыть машину перед заездом на линию?", a: "Да, автомобиль должен быть чистым. Особое внимание уделите читаемости номеров и чистоте фар." },
    { q: "Пройду ли я техосмотр с трещиной на лобовом стекле?", a: "Трещины в зоне очистки стеклоочистителя со стороны водителя не допускаются. Если трещина со стороны пассажира — техосмотр пройти можно." },
  ];

  return (
    <main className={`min-h-screen bg-[#F8F9F7] text-[#151C2B] selection:bg-[#8BBA82] selection:text-white overflow-x-hidden relative ${manrope.className}`}>
      <LiquidGlassFilter />

      {/* ФОН */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8BBA8220_1px,transparent_1px),linear-gradient(to_bottom,#8BBA8220_1px,transparent_1px)] bg-[size:40px_40px]"></div>

        <svg className="absolute top-[5%] left-0 h-[80vh] w-auto opacity-[0.14] text-[#61403A] drop-shadow-2xl" viewBox="0 0 200 800" fill="currentColor">
          <path d="M0,0 C150,120 220,280 150,480 C90,680 40,740 0,800 Z" />
        </svg>
        <svg className="absolute bottom-[0%] right-0 h-[85vh] w-auto opacity-[0.12] text-[#61403A] drop-shadow-2xl" viewBox="0 0 200 800" fill="currentColor">
          <path d="M200,0 C60,140 10,280 90,500 C140,700 180,750 200,800 Z" />
        </svg>

        <svg className="absolute top-[45%] w-[120%] h-auto opacity-[0.08] text-[#61403A] -right-[10%]" viewBox="0 0 1440 320" preserveAspectRatio="none" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M1440,160 C1120,0, 1020,320, 720,160 C420,0, 320,300, 0,160" />
        </svg>

        <div className="absolute top-[-10%] right-[-5%] w-[700px] h-[700px] rounded-full bg-gradient-to-br from-[#8BBA82] to-[#EEF3ED] opacity-65 blur-[90px]"></div>
        <div className="absolute bottom-[10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-[#61403A] to-[#8BBA82] opacity-[0.25] blur-[110px]"></div>
        <div className="absolute top-[35%] left-[-15%] w-[500px] h-[500px] rounded-full bg-[#8BBA82] opacity-35 blur-[90px]"></div>
      </div>

      {/* ШАПКА (Пункт «Кому нужен ТО» -> #law) */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="fixed top-3 sm:top-4 left-3 right-3 sm:left-4 sm:right-4 md:left-1/2 md:-translate-x-1/2 md:w-[calc(100%-2rem)] max-w-[1400px] z-50 bg-white/85 backdrop-blur-2xl border border-white/80 rounded-[26px] md:rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.06)]"
      >
        <div className="w-full mx-auto px-4 sm:px-5 md:px-8 h-[64px] sm:h-[70px] md:h-[80px] flex justify-between items-center gap-2">
          <div className="text-[18px] sm:text-xl md:text-[26px] font-extrabold tracking-tight text-[#61403A] flex items-center gap-1.5 shrink-0">
            ТЕХПЛЮС<span className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-[#8BBA82] inline-block mb-0.5"></span>
          </div>

          {/* Навигация для ПК */}
          <nav className="hidden md:flex items-center gap-5 lg:gap-8 text-[15px] font-bold text-[#657080]">
            <a href="#docs" className="hover:text-[#151C2B] transition-colors whitespace-nowrap">Документы</a>
            <a href="#services" className="hover:text-[#151C2B] transition-colors whitespace-nowrap">Услуги</a>
            <a href="#law" className="hover:text-[#151C2B] transition-colors whitespace-nowrap">Кому нужен ТО</a>
            <a href="#booking" className="bg-[#8BBA82]/10 hover:bg-[#8BBA82] text-[#8BBA82] hover:text-white px-5 py-2 rounded-full transition-all whitespace-nowrap">Записаться</a>
            <a href="#faq" className="hover:text-[#151C2B] transition-colors whitespace-nowrap">FAQ</a>
            <a href="#contacts" className="hover:text-[#151C2B] transition-colors whitespace-nowrap">Контакты</a>
          </nav>

          <div className="flex items-center gap-2">
            <a
              href="tel:+79882556547"
              className="flex items-center gap-1.5 sm:gap-2 bg-[#F8F9F7] border border-[#E8EBE8] hover:bg-[#EEF3ED] text-[#151C2B] font-bold text-[12px] sm:text-sm md:text-base px-3 py-2 sm:px-4 md:px-5 md:py-2.5 rounded-full transition-colors whitespace-nowrap shrink-0"
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#8BBA82]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span className="hidden sm:inline">+7 (988) 255-65-47</span>
              <span className="inline sm:hidden">Позвонить</span>
            </a>

            {/* Кнопка открытия меню на мобильных */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Открыть меню разделов"
              aria-expanded={mobileMenuOpen}
              className="md:hidden w-10 h-10 rounded-full bg-[#EEF3ED] text-[#61403A] flex items-center justify-center shrink-0 active:scale-95 transition-transform"
            >
              {mobileMenuOpen ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Выпадающее меню разделов для мобильных */}
        {mobileMenuOpen && (
          <nav className="md:hidden px-4 pb-4 pt-2 border-t border-[#E8EBE8]/80 flex flex-col gap-1.5 text-[15px] font-bold text-[#657080]">
            <a href="#docs" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2.5 rounded-xl hover:bg-[#F8F9F7] text-[#151C2B]">Документы</a>
            <a href="#services" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2.5 rounded-xl hover:bg-[#F8F9F7] text-[#151C2B]">Услуги</a>
            <a href="#law" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2.5 rounded-xl hover:bg-[#F8F9F7] text-[#151C2B]">Кому нужен ТО</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2.5 rounded-xl hover:bg-[#F8F9F7] text-[#151C2B]">FAQ</a>
            <a href="#contacts" onClick={() => setMobileMenuOpen(false)} className="px-3 py-2.5 rounded-xl hover:bg-[#F8F9F7] text-[#151C2B]">Контакты</a>
            <a
              href="#booking"
              onClick={() => setMobileMenuOpen(false)}
              className="mt-1 bg-[#8BBA82] text-white text-center py-3 rounded-full shadow-md"
            >
              Записаться на техосмотр
            </a>
          </nav>
        )}
      </motion.header>

      {/* ПЕРВЫЙ ЭКРАН */}
      <section className="relative pt-[110px] pb-12 sm:pt-[140px] sm:pb-16 md:pt-[190px] md:pb-24 px-4 sm:px-6 md:px-12 max-w-[1440px] mx-auto grid lg:grid-cols-[45%_55%] gap-8 md:gap-14 items-center z-10 overflow-hidden">
        <motion.div initial="hidden" animate="visible" variants={fadeInLeft} className="space-y-4 sm:space-y-5 md:space-y-6 pr-0 md:pr-4">
          <div className="inline-flex items-center gap-2 sm:gap-2.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full bg-white border border-[#E8EBE8] text-[#151C2B] text-xs md:text-sm font-bold shadow-sm relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#8BBA82]"></div>
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#8BBA82] ml-1 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
            <span>Аккредитация РСА: № 16412 (реестр операторов ТО)</span>
          </div>

          <h1 className="text-[34px] sm:text-[48px] md:text-[66px] font-bold tracking-tight leading-[1.1] text-[#151C2B]">
            Официальный <br className="hidden sm:block" />
            <span className={`${playfair.className} text-[#61403A] text-[46px] sm:text-[64px] md:text-[88px] font-semibold leading-[0.9] block pt-1.5 pb-2.5 sm:pt-2 sm:pb-3 md:pt-3 md:pb-4 drop-shadow-sm`}>
              техосмотр
            </span>
            в Ростове
          </h1>

          <p className="text-[15px] sm:text-[16px] md:text-[19px] text-[#657080] max-w-md leading-relaxed font-medium">
            Аккредитованный пункт. Моментальная передача данных в ЕАИСТО для успешной регистрации в ГИБДД. Выполним работу за 30 минут. 175 метров до МРЭО.
          </p>

          <div className="flex flex-col xl:flex-row items-stretch sm:items-start xl:items-center gap-4 sm:gap-6 pt-2 md:pt-4">
            <LiquidButton
              href="#booking"
              className="bg-[#8BBA82]/85 hover:bg-[#8BBA82] text-white shadow-[0_10px_30px_rgba(139,186,130,0.4)] hover:-translate-y-1 w-full sm:w-auto group z-20"
            >
              Выбрать время
              <span className="bg-white text-[#8BBA82] w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center group-hover:translate-x-1 transition-transform shadow-sm">
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
              </span>
            </LiquidButton>

            <div className="flex items-center gap-4 sm:gap-5 bg-white/35 px-5 py-3.5 sm:px-6 sm:py-4 md:px-7 md:py-5 rounded-[22px] sm:rounded-[24px] border border-white/80 relative overflow-hidden group w-full xl:w-auto">
              <LiquidGlassLayer roundedClass="rounded-[22px] sm:rounded-[24px]" />
              <div className="absolute left-0 top-0 bottom-0 w-2 bg-[#8BBA82] z-10"></div>
              <div className="w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full bg-white/80 flex items-center justify-center text-[#8BBA82] shrink-0 group-hover:scale-110 transition-transform shadow-sm border border-white/70 relative z-10">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <div className="font-semibold text-[#151C2B] leading-snug relative z-10">
                <div className="text-[#61403A] font-black mb-1 text-[12px] sm:text-[13px] md:text-[14px] uppercase tracking-wider">Режим работы</div>
                <div className="text-[14px] sm:text-[15px] md:text-[17px] mb-0.5">Пн–Сб: <span className="text-[#151C2B]/75 font-medium">8:00 – 18:00</span></div>
                <div className="text-[14px] sm:text-[15px] md:text-[17px]">Вс: <span className="text-[#151C2B]/75 font-medium">9:00 – 17:00</span></div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Правая колонка: Фотография */}
        <motion.div initial="hidden" animate="visible" variants={fadeInRight} className="relative w-full h-[330px] sm:h-[450px] md:h-[600px] lg:h-[650px] mt-4 lg:mt-0 isolate lg:-ml-4 xl:-ml-8 pl-2 sm:pl-0">
          <div className="absolute inset-0 bg-[#61403A] -translate-x-2 translate-y-3 sm:-translate-x-3 sm:translate-y-4 md:-translate-x-5 md:translate-y-6 rounded-[24px] sm:rounded-[28px] md:rounded-[40px] z-0"></div>
          <div className="relative w-full h-full z-10 rounded-[24px] sm:rounded-[28px] md:rounded-[40px] overflow-hidden bg-gray-100 shadow-[0_20px_40px_rgba(97,64,58,0.15)]">
            <Image
              src="/hero.png"
              alt="Официальный пункт техосмотра ТЕХПЛЮС в Ростове-на-Дону, ул. Доватора зд. 271"
              fill
              sizes="(max-width: 1024px) 100vw, 55vw"
              className="object-cover object-[25%_center] z-0 brightness-105 saturate-[1.10]"
              priority
            />
          </div>

          <div className="absolute top-3 right-3 sm:top-6 sm:right-6 md:top-8 md:right-8 overflow-hidden bg-white/45 px-3.5 py-2.5 sm:px-5 sm:py-3.5 rounded-[18px] sm:rounded-[24px] flex items-center gap-2.5 sm:gap-4 z-20 border border-white/80">
            <LiquidGlassLayer roundedClass="rounded-[18px] sm:rounded-[24px]" />
            <div className="relative z-10 bg-white/85 p-1.5 sm:p-2.5 rounded-full text-[#8BBA82] shadow-sm border border-white/80">
              <svg className="w-4 h-4 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>
            </div>
            <div className="relative z-10 flex flex-col">
              <span className="text-[#151C2B] font-extrabold text-[13px] sm:text-[15px] leading-tight">Ростов-на-Дону</span>
              <span className="text-[#151C2B]/90 font-bold text-[11px] sm:text-[13px] mt-0.5">ул. Доватора, зд. 271</span>
            </div>
          </div>

          <div className="absolute bottom-3 right-3 sm:bottom-6 sm:right-6 sm:left-auto md:bottom-8 md:right-8 overflow-hidden bg-white/45 px-4 py-2.5 sm:px-6 sm:py-4 rounded-[18px] sm:rounded-[24px] flex items-center gap-2.5 sm:gap-3 z-20 border border-white/80">
            <LiquidGlassLayer roundedClass="rounded-[18px] sm:rounded-[24px]" />
            <div className="relative z-10 bg-white/85 p-1.5 sm:p-2 rounded-full border border-white/80 shadow-sm shrink-0">
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#61403A]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            </div>
            <span className="relative z-10 text-[#151C2B] font-extrabold text-[11px] sm:text-sm tracking-wide">Быстро • Надёжно • Официально</span>
          </div>
        </motion.div>
      </section>

      {/* === БЛОК 1: ВСЕ ДЛЯ ПОСТАНОВКИ НА УЧЕТ === */}
      <section id="docs" className="scroll-mt-28 md:scroll-mt-32 py-12 md:py-20 max-w-[1440px] mx-auto px-4 sm:px-6 md:px-12 relative z-10">
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeInUp} className="text-center mb-8 md:mb-12">
          <div className="flex items-center justify-center gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div className="h-px bg-[#E8EBE8] w-10 sm:w-12 md:w-24"></div>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-[#E8EBE8] flex items-center justify-center text-[#8BBA82] bg-white shadow-sm">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            </div>
            <div className="h-px bg-[#E8EBE8] w-10 sm:w-12 md:w-24"></div>
          </div>
          <h2 className="text-[26px] sm:text-[32px] md:text-[42px] font-extrabold text-[#61403A] tracking-tight leading-tight">
            Все для постановки <span className="text-[#8BBA82]">на учет</span>
          </h2>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">

          {/* Карточка 1: Документы */}
          <div className="md:col-span-2 lg:col-span-2 h-full">
            <TiltCard className="bg-gradient-to-br from-[#9DC895] to-[#8BBA82] rounded-[24px] md:rounded-[32px] p-5 sm:p-6 md:p-9 shadow-lg border border-[#8BBA82]/30 flex flex-col md:flex-row items-start md:items-center justify-between overflow-hidden relative h-full">
              <div className="absolute top-[-50%] left-[-10%] w-[300px] h-[300px] bg-white/20 rounded-full blur-[60px] pointer-events-none"></div>
              <div className="relative z-10 w-full md:w-[74%]">
                <h3 className="text-[19px] sm:text-xl md:text-[30px] font-extrabold text-white leading-tight mb-4 md:mb-6 tracking-tight uppercase drop-shadow-sm">Всё, что нужно от вас:</h3>
                <ul className="flex flex-col gap-2.5 sm:gap-3 md:gap-4">
                  <li className="flex items-center gap-3.5 bg-white/15 backdrop-blur-md px-4 py-3 sm:px-5 sm:py-3.5 rounded-[14px] sm:rounded-[18px] border border-white/25 shadow-sm">
                    <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white text-[#8BBA82] flex items-center justify-center shrink-0 shadow-md font-black text-sm sm:text-base">1</span>
                    <span className="text-white font-semibold text-[14px] sm:text-[15px] md:text-[18px] leading-snug">
                      Документ, удостоверяющий личность (паспорт или водительские права)
                    </span>
                  </li>
                  <li className="flex items-center gap-3.5 bg-white/15 backdrop-blur-md px-4 py-3 sm:px-5 sm:py-3.5 rounded-[14px] sm:rounded-[18px] border border-white/25 shadow-sm">
                    <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white text-[#8BBA82] flex items-center justify-center shrink-0 shadow-md font-black text-sm sm:text-base">2</span>
                    <span className="text-white font-semibold text-[14px] sm:text-[15px] md:text-[18px] leading-snug">
                      Свидетельство о регистрации ТС или ПТС (в том числе электронный вариант ЭПТС)
                    </span>
                  </li>
                </ul>
              </div>
              <div className="hidden md:flex absolute bottom-8 right-8 items-center justify-center z-10 pointer-events-none">
                <div className="w-24 h-24 lg:w-32 lg:h-32 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/30 shadow-md">
                  <svg className="w-14 h-14 lg:w-16 lg:h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
              </div>
            </TiltCard>
          </div>

          {/* Карточка 2: 30 минут */}
          <div className="h-full">
            <TiltCard className="bg-white rounded-[20px] md:rounded-[32px] p-3.5 md:p-9 shadow-[0_8px_30px_rgba(30,40,30,0.04)] border border-[#E8EBE8]/80 group h-full">
              <div className="flex flex-row md:flex-col items-center md:items-start md:justify-center gap-3 md:gap-5 h-full w-full">
                <div className="w-11 h-11 md:w-14 md:h-14 rounded-2xl bg-[#EEF3ED] text-[#8BBA82] flex items-center justify-center shrink-0 shadow-sm border border-[#8BBA82]/10 group-hover:bg-[#8BBA82] group-hover:text-white transition-colors duration-500">
                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div className="text-left flex-1 md:flex-none min-w-0">
                  <h3 className="font-extrabold text-[16px] sm:text-[17px] md:text-[24px] text-[#61403A] leading-tight">Сделаем за <span className="text-[#8BBA82]">30 минут</span></h3>
                  <p className="hidden md:block text-[#657080] font-medium text-[15px] leading-relaxed mt-2.5">Ценим ваше время — быстрый и точный осмотр без очередей.</p>
                </div>
              </div>
            </TiltCard>
          </div>

          {/* Карточка 3: 175 метров до МРЭО */}
          <div className="h-full">
            <TiltCard className="bg-white rounded-[20px] md:rounded-[32px] p-3.5 md:p-9 shadow-[0_8px_30px_rgba(30,40,30,0.04)] border border-[#E8EBE8]/80 group relative overflow-hidden h-full">
              <div className="hidden md:block absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                <svg className="w-36 h-36" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" /></svg>
              </div>
              <div className="flex flex-row md:flex-col items-center md:items-start md:justify-center gap-3 md:gap-5 h-full w-full relative z-10">
                <div className="w-11 h-11 md:w-14 md:h-14 rounded-2xl bg-[#EEF3ED] text-[#8BBA82] flex items-center justify-center shrink-0 shadow-sm border border-[#8BBA82]/10 group-hover:bg-[#8BBA82] group-hover:text-white transition-colors duration-500">
                  <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                <div className="text-left flex-1 md:flex-none min-w-0">
                  <h3 className="font-extrabold text-[16px] sm:text-[17px] md:text-[24px] text-[#61403A] leading-tight">175 метров до МРЭО</h3>
                  <p className="hidden md:block text-[#657080] font-medium text-[15px] leading-relaxed mt-2.5">Идеальное расположение. Диагностика прямо у ГИБДД.</p>
                </div>
              </div>
            </TiltCard>
          </div>

          {/* Карточка 4: ЕАИСТО */}
          <div className="md:col-span-2 lg:col-span-2 h-full">
            <TiltCard className="bg-[#61403A] rounded-[20px] md:rounded-[32px] p-3.5 md:p-9 shadow-lg md:shadow-xl border border-white/10 overflow-hidden group h-full relative">
              <div className="absolute right-[-10%] top-[-20%] w-72 h-72 bg-[#8BBA82]/20 rounded-full blur-[60px] pointer-events-none group-hover:bg-[#8BBA82]/40 transition-colors duration-700"></div>
              <div className="flex flex-row items-center gap-3 md:gap-6 w-full h-full relative z-10">
                <div className="w-11 h-11 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-white/10 border border-white/20 text-[#8BBA82] flex items-center justify-center shrink-0 backdrop-blur-md shadow-inner">
                  <svg className="w-5 h-5 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                </div>
                <div className="text-left flex-1 min-w-0">
                  <h3 className="font-extrabold text-[16px] sm:text-[18px] md:text-[28px] text-white leading-tight tracking-wide drop-shadow-sm">Официально в ЕАИСТО</h3>
                  <p className="hidden md:block text-white/80 font-medium text-[15px] md:text-[16px] leading-relaxed max-w-md mt-2">Моментально вносим данные в единую базу без задержек и очередей.</p>
                </div>
              </div>
            </TiltCard>
          </div>

        </motion.div>
      </section>

      {/* === БЛОК 2: ОТДЕЛЬНАЯ ЗОНА «УСЛУГИ» (С выпадающим описанием на телефонах, без ссылок справа внизу) === */}
      <section id="services" className="scroll-mt-28 md:scroll-mt-32 py-10 md:py-16 max-w-[1440px] mx-auto px-4 sm:px-6 md:px-12 relative z-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeInUp}
          className="relative overflow-hidden rounded-[28px] sm:rounded-[36px] md:rounded-[44px] bg-white/75 backdrop-blur-2xl border border-white/90 shadow-[0_20px_60px_rgba(97,64,58,0.06)] p-5 sm:p-8 md:p-12 lg:p-14"
        >
          {/* Декоративные пятна в фирменных цветах */}
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#8BBA82]/15 blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-[#61403A]/10 blur-3xl pointer-events-none"></div>

          {/* Шапка зоны Услуги */}
          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4 mb-7 sm:mb-9 md:mb-12">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EEF3ED] text-[#8BBA82] text-xs font-extrabold uppercase tracking-wider mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8BBA82]"></span>
                Комплексный сервис у МРЭО
              </div>
              <h2 className="text-[28px] sm:text-[36px] md:text-[46px] font-extrabold text-[#61403A] tracking-tight leading-[1.08]">
                Наши <span className={`${playfair.className} font-semibold text-[#8BBA82]`}>услуги</span>
              </h2>
            </div>
            <p className="text-[#657080] font-medium text-[14px] sm:text-[15px] md:text-[16px] max-w-md leading-relaxed">
              Всё необходимое для регистрации транспорта в ГИБДД в одном месте — без лишних поездок по городу.
            </p>
          </div>

          {/* Сетка 4 услуг */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerContainer}
            className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 md:gap-6 items-start"
          >
            {/* Услуга 01: Техосмотр категорий L, M1, N1 */}
            <TiltCard className="bg-[#F8F9F7]/90 hover:bg-white rounded-[22px] md:rounded-[28px] p-4 sm:p-6 md:p-8 border border-[#E8EBE8] hover:border-[#8BBA82]/50 shadow-sm hover:shadow-xl transition-all duration-300 group h-full">
              <div className="flex flex-col justify-between h-full">
                <div className="flex flex-col gap-3 md:gap-5 w-full">
                  <button
                    type="button"
                    onClick={() => setOpenService(openService === 0 ? null : 0)}
                    aria-expanded={openService === 0}
                    className="w-full flex items-center justify-between gap-3 text-left md:cursor-default focus:outline-none"
                  >
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                      <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-[#EEF3ED] text-[#8BBA82] flex items-center justify-center shrink-0 group-hover:bg-[#8BBA82] group-hover:text-white transition-colors duration-300 shadow-sm">
                        <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <div className="md:hidden flex-1 min-w-0">
                        <h3 className="font-extrabold text-[16px] text-[#61403A] leading-tight">Категории L, M1, N1</h3>
                        <span className="inline-block text-[11px] font-bold text-[#8BBA82] mt-0.5">Диагностическая карта ЕАИСТО</span>
                      </div>
                    </div>

                    <div className={`md:hidden w-9 h-9 rounded-full border flex items-center justify-center shrink-0 transition-all duration-300 ${openService === 0 ? 'rotate-180 bg-[#8BBA82] border-[#8BBA82] text-white shadow-sm' : 'border-[#E8EBE8] text-[#8BBA82] bg-white'}`}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                    </div>

                    <div className="hidden md:flex items-center gap-2.5 shrink-0">
                      <span className="px-3 py-1 rounded-full bg-[#EEF3ED] text-[#8BBA82] text-xs font-extrabold">Официально</span>
                      <span className="text-2xl font-black text-[#61403A]/15 group-hover:text-[#8BBA82]/40 transition-colors">01</span>
                    </div>
                  </button>

                  <div className={`${openService === 0 ? 'block pt-3 border-t border-[#E8EBE8]/80' : 'hidden'} md:block md:pt-0 md:border-none`}>
                    <h3 className="hidden md:block font-extrabold text-[22px] text-[#61403A] mb-2 leading-tight">Техосмотр категорий L, M1, N1</h3>
                    <p className="text-[#657080] font-medium text-[14px] md:text-[15px] leading-relaxed">
                      Любые марки легковых и грузовых автомобилей до 3,5 тонн и мотоциклы. Проверка по 55 параметрам с внесением в базу ЕАИСТО.
                    </p>
                  </div>
                </div>

                <div className={`${openService === 0 ? 'flex' : 'hidden'} md:flex pt-3.5 md:pt-4 mt-3.5 md:mt-4 border-t border-[#E8EBE8] items-center justify-between`}>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#657080]">За 30 минут</span>
                </div>
              </div>
            </TiltCard>

            {/* Услуга 02: Оформление ОСАГО */}
            <TiltCard className="bg-[#F8F9F7]/90 hover:bg-white rounded-[22px] md:rounded-[28px] p-4 sm:p-6 md:p-8 border border-[#E8EBE8] hover:border-[#8BBA82]/50 shadow-sm hover:shadow-xl transition-all duration-300 group h-full">
              <div className="flex flex-col justify-between h-full">
                <div className="flex flex-col gap-3 md:gap-5 w-full">
                  <button
                    type="button"
                    onClick={() => setOpenService(openService === 1 ? null : 1)}
                    aria-expanded={openService === 1}
                    className="w-full flex items-center justify-between gap-3 text-left md:cursor-default focus:outline-none"
                  >
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                      <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-[#EEF3ED] text-[#8BBA82] flex items-center justify-center shrink-0 group-hover:bg-[#8BBA82] group-hover:text-white transition-colors duration-300 shadow-sm">
                        <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                      </div>
                      <div className="md:hidden flex-1 min-w-0">
                        <h3 className="font-extrabold text-[16px] text-[#61403A] leading-tight">Оформление ОСАГО</h3>
                        <span className="inline-block text-[11px] font-bold text-[#8BBA82] mt-0.5">Полис сразу на месте</span>
                      </div>
                    </div>

                    <div className={`md:hidden w-9 h-9 rounded-full border flex items-center justify-center shrink-0 transition-all duration-300 ${openService === 1 ? 'rotate-180 bg-[#8BBA82] border-[#8BBA82] text-white shadow-sm' : 'border-[#E8EBE8] text-[#8BBA82] bg-white'}`}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                    </div>

                    <div className="hidden md:flex items-center gap-2.5 shrink-0">
                      <span className="px-3 py-1 rounded-full bg-[#EEF3ED] text-[#8BBA82] text-xs font-extrabold">Без переплат</span>
                      <span className="text-2xl font-black text-[#61403A]/15 group-hover:text-[#8BBA82]/40 transition-colors">02</span>
                    </div>
                  </button>

                  <div className={`${openService === 1 ? 'block pt-3 border-t border-[#E8EBE8]/80' : 'hidden'} md:block md:pt-0 md:border-none`}>
                    <h3 className="hidden md:block font-extrabold text-[22px] text-[#61403A] mb-2 leading-tight">Оформление ОСАГО</h3>
                    <p className="text-[#657080] font-medium text-[14px] md:text-[15px] leading-relaxed">
                      Подберем и оформим страховой полис прямо на месте после прохождения осмотра. Сравним предложения ведущих страховых компаний.
                    </p>
                  </div>
                </div>

                <div className={`${openService === 1 ? 'flex' : 'hidden'} md:flex pt-3.5 md:pt-4 mt-3.5 md:mt-4 border-t border-[#E8EBE8] items-center justify-between`}>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#657080]">Е-ОСАГО и бумажный бланк</span>
                </div>
              </div>
            </TiltCard>

            {/* Услуга 03: Новые госномера */}
            <TiltCard className="bg-[#F8F9F7]/90 hover:bg-white rounded-[22px] md:rounded-[28px] p-4 sm:p-6 md:p-8 border border-[#E8EBE8] hover:border-[#8BBA82]/50 shadow-sm hover:shadow-xl transition-all duration-300 group h-full">
              <div className="flex flex-col justify-between h-full">
                <div className="flex flex-col gap-3 md:gap-5 w-full">
                  <button
                    type="button"
                    onClick={() => setOpenService(openService === 2 ? null : 2)}
                    aria-expanded={openService === 2}
                    className="w-full flex items-center justify-between gap-3 text-left md:cursor-default focus:outline-none"
                  >
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                      <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-[#EEF3ED] text-[#8BBA82] flex items-center justify-center shrink-0 group-hover:bg-[#8BBA82] group-hover:text-white transition-colors duration-300 shadow-sm">
                        <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      </div>
                      <div className="md:hidden flex-1 min-w-0">
                        <h3 className="font-extrabold text-[16px] text-[#61403A] leading-tight">Новые госномера</h3>
                        <span className="inline-block text-[11px] font-bold text-[#8BBA82] mt-0.5">За 1–2 минуты • Любые форматы</span>
                      </div>
                    </div>

                    <div className={`md:hidden w-9 h-9 rounded-full border flex items-center justify-center shrink-0 transition-all duration-300 ${openService === 2 ? 'rotate-180 bg-[#8BBA82] border-[#8BBA82] text-white shadow-sm' : 'border-[#E8EBE8] text-[#8BBA82] bg-white'}`}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                    </div>

                    <div className="hidden md:flex items-center gap-2.5 shrink-0">
                      <span className="px-3 py-1 rounded-full bg-[#EEF3ED] text-[#8BBA82] text-xs font-extrabold">За 1–2 минуты</span>
                      <span className="text-2xl font-black text-[#61403A]/15 group-hover:text-[#8BBA82]/40 transition-colors">03</span>
                    </div>
                  </button>

                  <div className={`${openService === 2 ? 'block pt-3 border-t border-[#E8EBE8]/80' : 'hidden'} md:block md:pt-0 md:border-none`}>
                    <h3 className="hidden md:block font-extrabold text-[22px] text-[#61403A] mb-2 leading-tight">Изготовление госномеров</h3>
                    <p className="text-[#657080] font-medium text-[14px] md:text-[15px] leading-relaxed">
                      Сделаем дубликаты по ГОСТ за 1–2 минуты: стандартные прямоугольные, квадратные (тип 1А), на прицепы и мотоциклы — любые варианты.
                    </p>
                  </div>
                </div>

                <div className={`${openService === 2 ? 'flex' : 'hidden'} md:flex pt-3.5 md:pt-4 mt-3.5 md:mt-4 border-t border-[#E8EBE8] items-center justify-between`}>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#657080]">Прямоугольные • Квадратные • Прицеп</span>
                </div>
              </div>
            </TiltCard>

            {/* Услуга 04: Переоборудование автомобилей */}
            <TiltCard className="bg-[#61403A] rounded-[22px] md:rounded-[28px] p-4 sm:p-6 md:p-8 border border-white/10 shadow-lg hover:shadow-xl transition-all duration-300 group relative overflow-hidden h-full">
              <div className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-[#8BBA82]/20 blur-2xl pointer-events-none group-hover:bg-[#8BBA82]/35 transition-colors"></div>

              <div className="relative z-10 flex flex-col justify-between h-full">
                <div className="flex flex-col gap-3 md:gap-5 w-full">
                  <button
                    type="button"
                    onClick={() => setOpenService(openService === 3 ? null : 3)}
                    aria-expanded={openService === 3}
                    className="w-full flex items-center justify-between gap-3 text-left md:cursor-default focus:outline-none"
                  >
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                      <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/10 border border-white/15 text-[#8BBA82] flex items-center justify-center shrink-0 backdrop-blur-md">
                        <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      </div>
                      <div className="md:hidden flex-1 min-w-0">
                        <h3 className="font-extrabold text-[16px] text-white leading-tight">Переоборудование ТС</h3>
                        <span className="inline-block text-[11px] font-bold text-[#8BBA82] mt-0.5">Фаркоп • ГБО • Замена двигателя</span>
                      </div>
                    </div>

                    <div className={`md:hidden w-9 h-9 rounded-full border flex items-center justify-center shrink-0 transition-all duration-300 ${openService === 3 ? 'rotate-180 bg-[#8BBA82] border-[#8BBA82] text-white shadow-sm' : 'border-white/20 text-[#8BBA82] bg-white/10'}`}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                    </div>

                    <div className="hidden md:flex items-center gap-2.5 shrink-0">
                      <span className="px-3 py-1 rounded-full bg-white/10 text-[#8BBA82] text-xs font-extrabold border border-white/15">Регистрация в ГИБДД</span>
                      <span className="text-2xl font-black text-white/15">04</span>
                    </div>
                  </button>

                  <div className={`${openService === 3 ? 'block pt-3 border-t border-white/15' : 'hidden'} md:block md:pt-0 md:border-none`}>
                    <h3 className="hidden md:block font-extrabold text-[22px] text-white mb-2 leading-tight">Переоборудование автомобилей</h3>
                    <p className="text-white/80 font-medium text-[14px] md:text-[15px] leading-relaxed">
                      Помогаем с оформлением внесения изменений в конструкцию ТС: установка фаркопа, газового оборудования (ГБО), замена двигателя и другие доработки.
                    </p>
                  </div>
                </div>

                <div className={`${openService === 3 ? 'flex' : 'hidden'} md:flex pt-3.5 md:pt-4 mt-3.5 md:mt-4 border-t border-white/15 items-center justify-between`}>
                  <span className="text-xs font-bold uppercase tracking-wider text-white/60">Полное сопровождение</span>
                </div>
              </div>
            </TiltCard>
          </motion.div>
        </motion.div>
      </section>

      {/* БЛОК: ЗАКОН И БЕЗОПАСНОСТЬ (Добавлен id="law" и мобильный аккордеон для списка обязательных категорий) */}
      <motion.section
        id="law"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={fadeInUp}
        className="scroll-mt-28 md:scroll-mt-32 py-12 md:py-24 max-w-[1440px] mx-auto px-4 sm:px-6 md:px-12 relative z-10 border-t border-[#E8EBE8]/50"
      >
        <div className="text-center mb-8 md:mb-12">
          <div className="flex items-center justify-center gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div className="h-px bg-[#E8EBE8] w-10 sm:w-12 md:w-24"></div>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-[#E8EBE8] flex items-center justify-center text-[#8BBA82] bg-white shadow-sm">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <div className="h-px bg-[#E8EBE8] w-10 sm:w-12 md:w-24"></div>
          </div>
          <h2 className="text-[26px] sm:text-[32px] md:text-[42px] font-extrabold text-[#61403A] tracking-tight leading-tight">
            Почему техосмотр — это <span className={`${playfair.className} font-semibold text-[#8BBA82]`}>обязательно</span>?
          </h2>
          <p className="text-[#657080] mt-2.5 sm:mt-3 font-medium text-[14px] sm:text-[16px] max-w-2xl mx-auto">
            Наличие диагностической карты — это требование законодательства РФ и гарантия исправности ключевых узлов вашего автомобиля.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 md:gap-8 items-start">
          {/* Карточка 1: На телефоне — компактная плашка с раскрывающимся списком; на ПК — открыта сразу */}
          <TiltCard className="bg-white rounded-[24px] sm:rounded-[28px] md:rounded-[32px] p-4 sm:p-6 md:p-10 shadow-sm border border-[#E8EBE8] flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#8BBA82]/10 rounded-full blur-3xl pointer-events-none"></div>
            <div>
              {/* Шапка карточки: на мобильных кликабельна для раскрытия списка */}
              <button
                type="button"
                onClick={() => setIsMandatoryOpen((prev) => !prev)}
                aria-expanded={isMandatoryOpen}
                className="w-full flex items-center justify-between gap-3 text-left lg:cursor-default focus:outline-none"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-[#EEF3ED] text-[#8BBA82] flex items-center justify-center shrink-0 shadow-sm border border-[#8BBA82]/20">
                    <svg className="w-5 h-5 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  </div>
                  <div>
                    <h3 className="font-extrabold text-[17px] sm:text-[21px] md:text-[24px] text-[#61403A] leading-tight">
                      Для кого техосмотр обязателен
                    </h3>
                    <p className="lg:hidden text-[12px] sm:text-[13px] text-[#8BBA82] font-bold mt-0.5">
                      {isMandatoryOpen ? "Скрыть список категорий" : "Нажмите, чтобы посмотреть (8 категорий)"}
                    </p>
                  </div>
                </div>

                {/* Стрелка только на мобильных и планшетах (< lg) */}
                <div className={`lg:hidden w-9 h-9 sm:w-10 sm:h-10 rounded-full border flex items-center justify-center shrink-0 transition-all duration-300 ${isMandatoryOpen ? 'rotate-180 bg-[#8BBA82] border-[#8BBA82] text-white shadow-md' : 'border-[#E8EBE8] text-[#8BBA82] bg-[#F8F9F7]'}`}>
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Список категорий: на мобильных показывается по клику, на ПК (lg:block) виден всегда */}
              <div className={`${isMandatoryOpen ? 'block mt-4 pt-4 border-t border-[#E8EBE8]/70' : 'hidden'} lg:block lg:mt-5`}>
                <ul className="space-y-2.5 sm:space-y-3 text-[#151C2B]/90 font-medium text-[13.5px] sm:text-[14.5px] md:text-[15px] leading-snug mb-5 lg:mb-6">
                  {mandatoryList.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-[#EEF3ED] text-[#8BBA82] flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                        ✓
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <div className="pt-4 border-t border-[#E8EBE8]/60 flex items-center justify-between text-xs sm:text-sm font-bold text-[#8BBA82]">
                  <span>Проверка по 55 параметрам безопасности</span>
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </div>
              </div>
            </div>
          </TiltCard>

          {/* Карточка 2: Контроль ДПС и штрафы */}
          <TiltCard className="bg-[#61403A] rounded-[24px] sm:rounded-[28px] md:rounded-[32px] p-5 sm:p-7 md:p-10 shadow-xl text-white flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-[#8BBA82]/20 rounded-full blur-3xl pointer-events-none"></div>
            <div>
              <div className="flex items-center gap-3.5 mb-5">
                <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-white/10 text-[#8BBA82] flex items-center justify-center shrink-0 backdrop-blur-md border border-white/20">
                  <svg className="w-5 h-5 sm:w-7 sm:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <h3 className="font-extrabold text-[18px] sm:text-[22px] md:text-[24px] text-white leading-tight">
                  Контроль ДПС и штрафы
                </h3>
              </div>

              <div className="space-y-3 md:space-y-4 mb-6">
                <div className="bg-white/10 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-white/15">
                  <div className="text-[11px] sm:text-xs uppercase font-extrabold text-[#8BBA82] mb-1">Для физических лиц (в личных целях)</div>
                  <div className="text-[13px] sm:text-[14.5px] md:text-[15px] font-semibold text-white/95 leading-snug">
                    Обязательный техосмотр не требуется — контроль за техническим состоянием остаётся за водителем и инспектором ДПС ГАИ. <strong>При наличии действующей диагностической карты проверка техсостояния на дороге не проводится.</strong>
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-white/15">
                  <div className="text-[11px] sm:text-xs uppercase font-extrabold text-[#8BBA82] mb-1">Штраф для физических лиц</div>
                  <div className="text-[13px] sm:text-[14.5px] md:text-[15px] font-semibold text-white/95 leading-snug">
                    При отсутствии диагностической карты (когда она обязательна по закону) — штраф <strong>2 000 рублей</strong> (ст. 12.5 КоАП РФ).
                  </div>
                </div>

                <div className="bg-white/10 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl border border-white/15">
                  <div className="text-[11px] sm:text-xs uppercase font-extrabold text-[#8BBA82] mb-1">Для юридических лиц</div>
                  <div className="text-[13px] sm:text-[14.5px] md:text-[15px] font-semibold text-white/95 leading-snug">
                    Штрафы для организаций и должностных лиц за выпуск на линию ТС без техосмотра достигают <strong>50 000 рублей</strong>.
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-bold">
              <span className="text-white/60">Нормативная база:</span>
              <div className="flex flex-wrap items-center gap-3">
                <a href="https://www.consultant.ru/document/cons_doc_LAW_34661/fa21e6efbc72793ef1ef868ef4ae90d81ef3b584/" target="_blank" rel="noopener noreferrer" className="text-[#8BBA82] hover:text-white underline underline-offset-4 transition-colors">ст. 12.1 КоАП РФ ↗</a>
                <a href="https://www.consultant.ru/document/cons_doc_LAW_34661/28236d2e66fc03e945fa671400f9116c4f039369/" target="_blank" rel="noopener noreferrer" className="text-[#8BBA82] hover:text-white underline underline-offset-4 transition-colors">ст. 12.5 КоАП РФ ↗</a>
              </div>
            </div>
          </TiltCard>
        </div>
      </motion.section>

      {/* ИНТЕРАКТИВНАЯ ГАЛЕРЕЯ */}
      <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeInUp} className="py-12 md:py-24 overflow-hidden relative z-10 border-t border-[#E8EBE8]/50">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 mb-8 md:mb-12 text-center">
          <h2 className="text-[28px] sm:text-[32px] md:text-[49px] font-extrabold text-[#61403A] tracking-tight">
            Наша <span className={`${playfair.className} font-semibold text-[#61403A]`}>галерея</span>
          </h2>
        </div>

        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="relative w-full max-w-[1440px] mx-auto h-[340px] sm:h-[420px] md:h-[500px] flex items-center justify-center touch-pan-y"
        >
          <button type="button" onClick={handlePrev} aria-label="Предыдущее фото" className="absolute left-1 sm:left-4 md:left-[calc(50%-380px)] top-1/2 -translate-y-1/2 z-[100] text-[#61403A] drop-shadow-[0_2px_6px_rgba(255,255,255,0.9)] hover:scale-110 transition-transform duration-200 cursor-pointer p-2 md:p-4 focus:outline-none">
            <svg className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
          </button>

          <button type="button" onClick={handleNext} aria-label="Следующее фото" className="absolute right-1 sm:right-4 md:right-[calc(50%-380px)] top-1/2 -translate-y-1/2 z-[100] text-[#61403A] drop-shadow-[0_2px_6px_rgba(255,255,255,0.9)] hover:scale-110 transition-transform duration-200 cursor-pointer p-2 md:p-4 focus:outline-none">
            <svg className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
          </button>

          <div className="relative w-full max-w-5xl h-full flex items-center justify-center pointer-events-none">
            {galleryPhotos.map((item, index) => {
              const isCurrent = index === currentPhotoIndex;
              const isPrev = index === (currentPhotoIndex - 1 + galleryPhotos.length) % galleryPhotos.length;
              const isNext = index === (currentPhotoIndex + 1) % galleryPhotos.length;

              let positionClasses = "opacity-0 scale-75 z-0";
              if (isCurrent) positionClasses = "translate-x-0 scale-100 z-30 opacity-100 blur-none shadow-2xl pointer-events-auto cursor-default";
              else if (isPrev) positionClasses = "-translate-x-[35%] sm:-translate-x-[40%] md:-translate-x-[60%] scale-[0.85] z-20 opacity-60 blur-[4px] cursor-pointer hover:opacity-100 pointer-events-auto";
              else if (isNext) positionClasses = "translate-x-[35%] sm:translate-x-[40%] md:translate-x-[60%] scale-[0.85] z-20 opacity-60 blur-[4px] cursor-pointer hover:opacity-100 pointer-events-auto";

              return (
                <div
                  key={index}
                  onClick={() => { if (isPrev) handlePrev(); if (isNext) handleNext(); }}
                  className={`absolute w-[84%] sm:w-[70%] md:w-[600px] h-[94%] rounded-2xl sm:rounded-3xl border border-gray-200 flex items-center justify-center transition-all duration-700 ease-out overflow-hidden ${positionClasses}`}
                >
                  <Image
                    src={item.src}
                    alt={item.title}
                    fill
                    sizes="(max-width: 768px) 85vw, 600px"
                    className="object-cover"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* ФОРМА БРОНИРОВАНИЯ + ЖИВОЙ ЭЛЕКТРОННЫЙ ТАЛОН + БЫСТРЫЕ КНОПКИ ДАТЫ */}
      <section className="relative z-10 pt-8 md:pt-12 pb-12 md:pb-24 overflow-hidden">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-12">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={zoomIn}
            id="booking"
            className="scroll-mt-28 md:scroll-mt-32 bg-[#61403A] p-6 sm:p-8 md:p-12 lg:p-14 rounded-[28px] sm:rounded-[40px] text-white shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#8BBA82]/10 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none"></div>

            <div className="relative z-10">
              {/* Шапка блока бронирования */}
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-8 md:mb-10">
                <div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-2">Бронирование времени</h2>
                  <p className="text-[#8BBA82] font-medium opacity-95 text-sm sm:text-base">
                    Заполните данные автомобиля и выберите удобное время — ваш электронный талон сформируется автоматически.
                  </p>
                </div>

                {/* Живой электронный талон-превью (Вариант 1) */}
                <div className="relative overflow-hidden bg-white/10 backdrop-blur-xl border border-white/25 rounded-[22px] p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0 lg:min-w-[420px]">
                  <div className="flex flex-col gap-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#8BBA82] animate-pulse"></span>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-white/70">
                        {status.type === 'success' ? 'Талон подтверждён' : 'Электронный талон на линию'}
                      </span>
                    </div>

                    {/* Номерной знак в стиле РФ */}
                    <div className="inline-flex items-stretch bg-white text-[#151C2B] rounded-lg border-2 border-[#151C2B] overflow-hidden shadow-md w-fit">
                      <div className={`px-3 py-1 font-black tracking-wider text-base sm:text-lg flex items-center ${ticketPlate.isPlaceholder ? 'opacity-40' : ''}`}>
                        {ticketPlate.main}
                      </div>
                      <div className="border-l-2 border-[#151C2B] px-2 py-0.5 flex flex-col items-center justify-center bg-white leading-none">
                        <span className={`font-black text-xs sm:text-sm ${ticketPlate.isPlaceholder ? 'opacity-40' : ''}`}>
                          {ticketPlate.region}
                        </span>
                        <span className="text-[8px] font-extrabold tracking-tighter flex items-center gap-0.5 mt-0.5">
                          RUS
                          <span className="inline-block w-2.5 h-1.5 border border-black/20 overflow-hidden">
                            <span className="block h-1/3 bg-white"></span>
                            <span className="block h-1/3 bg-[#0039A6]"></span>
                            <span className="block h-1/3 bg-[#D52B1E]"></span>
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="sm:border-l sm:border-white/15 sm:pl-4 flex flex-row sm:flex-col justify-between w-full sm:w-auto gap-2 text-xs">
                    <div>
                      <div className="text-white/50 text-[10px] uppercase font-bold">Дата и время</div>
                      <div className="font-extrabold text-white text-sm">
                        {formData.date
                          ? `${formData.date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}${formData.time ? ` • ${formData.time}` : ''}`
                          : 'Не выбрано'}
                      </div>
                    </div>
                    <div>
                      <div className="text-white/50 text-[10px] uppercase font-bold">Пост ТО</div>
                      <div className="font-bold text-[#8BBA82]">Доватора, зд. 271</div>
                    </div>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-10 items-start">
                {/* ЛЕВЫЙ СТОЛБИК: Данные автомобиля и контакты */}
                <div className="space-y-4 sm:space-y-5 bg-white/5 p-5 sm:p-6 md:p-8 rounded-[22px] sm:rounded-[28px] border border-white/10">
                  <div>
                    <label className="block text-[10px] md:text-xs font-bold uppercase tracking-wider text-white/60 mb-1.5 sm:mb-2 pl-1">
                      Номер машины
                    </label>
                    <input
                      required
                      type="text"
                      name="carNumber"
                      maxLength={12}
                      value={formData.carNumber}
                      onChange={handleChange}
                      className="w-full p-3.5 sm:p-4 md:p-5 bg-white/10 border border-white/20 rounded-[16px] sm:rounded-[20px] text-white placeholder-white/30 focus:outline-none focus:border-[#8BBA82] focus:bg-white/20 uppercase text-sm md:text-base transition-all"
                      placeholder="А 123 АА 161"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] md:text-xs font-bold uppercase tracking-wider text-white/60 mb-1.5 sm:mb-2 pl-1">
                      Телефон для связи
                    </label>
                    <input
                      required
                      type="tel"
                      name="phone"
                      maxLength={20}
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full p-3.5 sm:p-4 md:p-5 bg-white/10 border border-white/20 rounded-[16px] sm:rounded-[20px] text-white placeholder-white/30 focus:outline-none focus:border-[#8BBA82] focus:bg-white/20 text-sm md:text-base transition-all"
                      placeholder="+7 (___) ___-__-__"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] md:text-xs font-bold uppercase tracking-wider text-white/60 mb-1.5 sm:mb-2 pl-1">
                      Категория транспорта
                    </label>
                    <div className="relative">
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        className="w-full p-3.5 sm:p-4 md:p-5 pr-11 bg-[#8BBA82]/20 border border-[#8BBA82] rounded-[16px] sm:rounded-[20px] text-white focus:outline-none focus:border-white text-sm md:text-base appearance-none transition-all cursor-pointer font-semibold"
                      >
                        <option value="M1 Легковые автомобили" className="bg-[#61403A] text-white">M1 Легковые автомобили</option>
                        <option value="L Мотоциклы" className="bg-[#61403A] text-white">L Мотоциклы</option>
                        <option value="N1 Грузовики (до 3,5т)" className="bg-[#61403A] text-white">N1 Грузовики (до 3,5 т)</option>
                      </select>
                      <svg className="w-5 h-5 text-white/80 pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* ПРАВЫЙ СТОЛБИК: Быстрый выбор дня, календарь и слоты */}
                <div className="space-y-4 sm:space-y-5 bg-white/5 p-5 sm:p-6 md:p-8 rounded-[22px] sm:rounded-[28px] border border-white/10 flex flex-col justify-between h-full">
                  <div className="space-y-4 sm:space-y-5">
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pl-1">
                        <label className="block text-[10px] md:text-xs font-bold uppercase tracking-wider text-white/60">
                          Выберите день визита
                        </label>

                        {/* Быстрые кнопки выбора даты в один клик (Вариант 2) */}
                        <div className="flex items-center gap-1.5">
                          {quickDates.map((qd) => {
                            const active = isSameDay(formData.date, qd.date);
                            return (
                              <button
                                key={qd.label}
                                type="button"
                                onClick={() => handleSelectDate(new Date(qd.date))}
                                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                                  active
                                    ? 'bg-[#8BBA82] text-white shadow-sm'
                                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                                }`}
                              >
                                {qd.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <DatePicker
                        selected={formData.date}
                        onChange={handleSelectDate}
                        locale="ru"
                        dateFormat="dd MMMM yyyy"
                        minDate={today}
                        placeholderText="Или выберите дату в календаре"
                        className="w-full p-3.5 sm:p-4 md:p-5 bg-white/10 border border-white/20 rounded-[16px] sm:rounded-[20px] text-white placeholder-white/50 focus:outline-none focus:border-[#8BBA82] focus:bg-white/20 text-sm md:text-[17px] font-bold cursor-pointer transition-all"
                        wrapperClassName="w-full"
                      />
                    </div>

                    {formData.date ? (
                      <div className="relative z-20 pt-1">
                        <div className="flex items-center justify-between mb-2.5 sm:mb-3 pl-1">
                          <label className="block text-[10px] md:text-xs font-bold uppercase tracking-wider text-white/60">
                            {isLoadingSlots ? 'Обновление расписания...' : 'Доступные слоты'}
                          </label>
                          {bookedSlots.length > 0 && (
                            <span className="text-[11px] text-white/50">Серые слоты заняты</span>
                          )}
                        </div>

                        {availableSlots.length === 0 ? (
                          <div className="p-4 rounded-xl bg-white/10 border border-white/15 text-xs sm:text-sm text-white/80 text-center">
                            На сегодня свободных слотов уже нет. Пожалуйста, выберите другой день.
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 md:gap-2.5 max-h-52 overflow-y-auto pr-1 sm:pr-2 custom-scrollbar relative z-20">
                            {availableSlots.map(({ time, isBooked }) => {
                              const isSelected = formData.time === time;
                              return (
                                <button
                                  key={time}
                                  type="button"
                                  disabled={isBooked}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setFormData((prev) => ({ ...prev, time }));
                                  }}
                                  title={isBooked ? "Это время уже занято" : `Выбрать ${time}`}
                                  className={`py-2.5 px-1 md:px-2 text-xs sm:text-sm font-bold rounded-xl border transition-all whitespace-nowrap select-none ${
                                    isBooked
                                      ? 'bg-white/5 border-white/10 text-white/30 line-through cursor-not-allowed'
                                      : isSelected
                                      ? 'bg-[#8BBA82] border-[#8BBA82] text-white shadow-lg scale-[1.03] cursor-pointer'
                                      : 'bg-white/5 border-white/20 text-white hover:border-[#8BBA82] hover:bg-white/15 cursor-pointer'
                                  }`}
                                >
                                  {time}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 sm:p-5 rounded-[16px] sm:rounded-[20px] bg-white/5 border border-dashed border-white/20 text-white/60 text-xs sm:text-sm text-center">
                        Нажмите «Сегодня», «Завтра» или выберите дату в календаре, чтобы увидеть свободные окна
                      </div>
                    )}
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={!formData.time || isSubmitting}
                      className={`w-full font-bold py-4 sm:py-5 rounded-[16px] sm:rounded-[20px] transition-all shadow-lg text-[16px] sm:text-[17px] ${
                        formData.time && !isSubmitting
                          ? 'bg-[#8BBA82] hover:bg-[#77a66f] text-white shadow-[#8BBA82]/30 hover:-translate-y-1 cursor-pointer'
                          : 'bg-white/10 text-white/40 cursor-not-allowed shadow-none'
                      }`}
                    >
                      {isSubmitting ? 'Отправляем заявку...' : formData.time ? `Забронировать на ${formData.time}` : 'Выберите дату и время'}
                    </button>

                    {status.text && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-3.5 sm:p-4 rounded-[16px] border mt-4 ${
                          status.type === 'success'
                            ? 'bg-[#8BBA82]/20 border-[#8BBA82]/50 text-[#8BBA82]'
                            : status.type === 'loading'
                            ? 'bg-white/10 border-white/20 text-white'
                            : 'bg-red-500/20 border-red-500/50 text-red-200'
                        } text-center text-xs sm:text-sm font-medium`}
                      >
                        {status.text}
                      </motion.div>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={fadeInUp} id="faq" className="scroll-mt-28 md:scroll-mt-32 py-12 md:py-24 relative z-10">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-12">
          <div className="grid lg:grid-cols-[35fr_65fr] gap-8 md:gap-16 items-start">
            <div className="lg:sticky lg:top-32 space-y-3 sm:space-y-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EEF3ED] text-[#8BBA82] text-xs font-extrabold uppercase tracking-wider">
                Помощь и ответы
              </div>
              <h2 className={`text-[32px] sm:text-[46px] md:text-[54px] font-bold text-[#61403A] tracking-tight leading-[1.05]`}>
                Часто задаваемые <br />
                <span className={playfair.className}>вопросы</span>
              </h2>
              <p className="text-[#657080] font-medium text-[14px] sm:text-[16px] leading-relaxed max-w-sm">
                Мы собрали ответы на самые популярные вопросы о прохождении техосмотра, документах и оплате.
              </p>
            </div>

            <div className="space-y-3 sm:space-y-4">
              {faqs.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <motion.div
                    key={index}
                    initial={false}
                    animate={{ backgroundColor: isOpen ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.6)' }}
                    className="backdrop-blur-xl border border-[#E8EBE8] rounded-[20px] sm:rounded-[24px] overflow-hidden shadow-sm hover:border-[#8BBA82]/40 transition-all duration-300"
                  >
                    <button
                      onClick={() => setOpenFaq(isOpen ? null : index)}
                      className="w-full px-4 py-4 sm:px-6 sm:py-6 text-left flex justify-between items-center gap-3 focus:outline-none cursor-pointer"
                    >
                      <span className="font-extrabold text-[#151C2B] text-[15px] sm:text-[17px] md:text-[19px] leading-snug pr-2">{faq.q}</span>
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full border flex items-center justify-center flex-shrink-0 transition-all duration-300 ${isOpen ? 'rotate-180 bg-[#8BBA82] border-[#8BBA82] text-white shadow-md' : 'border-[#E8EBE8] text-[#8BBA82] bg-white'}`}>
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </button>
                    <motion.div
                      initial={false}
                      animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden px-4 sm:px-6"
                    >
                      <p className="text-[#657080] font-medium leading-relaxed text-[14px] sm:text-[16px] pb-4 sm:pb-6">{faq.a}</p>
                    </motion.div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.section>

      {/* КОНТАКТЫ */}
      <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={fadeInUp} id="contacts" className="scroll-mt-28 md:scroll-mt-32 py-12 md:py-24 max-w-[1440px] mx-auto px-4 sm:px-6 md:px-12 relative z-10 overflow-hidden">
        <div className="bg-gradient-to-br from-[#9DC895] to-[#8BBA82] rounded-[28px] sm:rounded-[40px] md:rounded-[48px] p-4 sm:p-6 md:p-12 shadow-2xl border border-[#8BBA82]/30 relative overflow-hidden">
          <div className="absolute top-[-50%] right-[-10%] w-[400px] h-[400px] bg-white/20 rounded-full blur-[80px] pointer-events-none"></div>

          <div className="grid lg:grid-cols-3 gap-5 sm:gap-8 md:gap-12 relative z-10">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInLeft} className="lg:col-span-1 flex flex-col justify-between space-y-6 sm:space-y-10 bg-white/95 backdrop-blur-2xl p-6 sm:p-8 md:p-10 rounded-[24px] sm:rounded-[32px] border border-white/60 shadow-lg">
              <div>
                <h2 className="text-[26px] sm:text-[32px] font-extrabold text-[#61403A] mb-5 sm:mb-8 tracking-tight">Ждем вас</h2>
                <div className="space-y-5 sm:space-y-7 text-[#657080]">
                  <div>
                    <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#8BBA82] mb-1.5 sm:mb-2">Адрес СТО</div>
                    <div className="font-bold text-[#151C2B] leading-snug text-[15px] sm:text-[16px]">344090, Ростовская обл.,<br />г. Ростов-на-Дону,<br />ул. Доватора, зд. 271, стр. 1</div>
                  </div>
                  <div>
                    <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#8BBA82] mb-1.5 sm:mb-2">Часы работы</div>
                    <div className="font-bold text-[#151C2B] text-[15px] sm:text-[16px] leading-snug">Пн - Сб • 8:00 - 18:00<br />Вс • 9:00 - 17:00</div>
                  </div>
                  <div>
                    <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#8BBA82] mb-1.5 sm:mb-2">Связь</div>
                    <a href="tel:+79882556547" className="font-black text-[22px] sm:text-[24px] md:text-[26px] text-[#61403A] block hover:text-[#8BBA82] transition-colors mb-1">+7 (988) 255-65-47</a>
                    <a href="mailto:tekhplus@yandex.ru" className="font-bold text-[#657080] hover:text-[#8BBA82] transition-colors text-[15px] sm:text-[16px]">tekhplus@yandex.ru</a>
                  </div>
                </div>
              </div>

              <div className="pt-5 sm:pt-6 mt-4 sm:mt-6 border-t border-[#E8EBE8]">
                <a href="https://yandex.ru/maps/?rtext=~Ростов-на-Дону,+улица+Доватора,+271с1&rtt=auto" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2.5 sm:gap-3 bg-[#8BBA82] hover:bg-[#77a66f] text-white font-extrabold py-3.5 sm:py-4 px-5 sm:px-6 rounded-full transition-all w-full text-[15px] sm:text-[16px] group shadow-md">
                  <svg className="w-5 h-5 group-hover:animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                  Построить маршрут
                </a>
              </div>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInRight} className="lg:col-span-2 h-[320px] sm:h-[400px] md:h-auto min-h-[320px] sm:min-h-[450px] bg-white rounded-[24px] sm:rounded-[32px] overflow-hidden relative shadow-lg border border-white/60">
              <iframe src="https://yandex.ru/map-widget/v1/?um=constructor%3A009b3fe9901a3701834297769ac0653821d629ea2a870450b2fdf9bd86a0c8be&source=constructor" title="Карта проезда к пункту техосмотра ТЕХПЛЮС" className="absolute inset-0 w-full h-full z-10 border-0" allowFullScreen={true}></iframe>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* ФУТЕР */}
      <motion.footer initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp} className="bg-white border-t border-[#E8EBE8] text-[#657080] py-8 sm:py-10 text-[13px] sm:text-[14px] relative z-10 font-medium">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-5 sm:gap-6">
          <div className="space-y-1.5 sm:space-y-2">
            <p className="text-[#151C2B] font-extrabold text-[14px] sm:text-[15px]">ООО "ТЕХПЛЮС" • ИНН 6168125681 • ОГРН 1256100025697</p>
            <p>Адрес: 344090, Ростовская обл., г. Ростов-на-Дону, ул. Доватора, зд. 271, стр. 1</p>
          </div>
          <div className="md:text-right space-y-1.5 sm:space-y-2 border-t border-[#E8EBE8] w-full md:w-auto pt-5 sm:pt-6 md:border-none md:pt-0">
            <p>© Copyright 2026 • <a href="https://техосмотр-на-доватора.рф" className="hover:text-[#8BBA82] transition-colors underline decoration-[#E8EBE8] underline-offset-4 break-all">техосмотр-на-доватора.рф</a></p>
            <p><a href="#contacts" className="hover:text-[#8BBA82] transition-colors underline decoration-[#E8EBE8] underline-offset-4">Политика конфиденциальности</a></p>
          </div>
        </div>
      </motion.footer>

      <style dangerouslySetInnerHTML={{
        __html: `
        html { scroll-behavior: smooth; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.3); border-radius: 10px; }
        
        .react-datepicker {
          font-family: inherit !important;
          background-color: #61403A !important;
          border: 1px solid rgba(255,255,255,0.2) !important;
          border-radius: 16px !important;
          color: white !important;
          padding: 10px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.4);
        }
        .react-datepicker-popper[data-placement^="bottom"] .react-datepicker__triangle::before, 
        .react-datepicker-popper[data-placement^="bottom"] .react-datepicker__triangle::after {
          border-bottom-color: #61403A !important;
        }
        .react-datepicker__header { background-color: transparent !important; border-bottom: 1px solid rgba(255,255,255,0.1) !important; }
        .react-datepicker__current-month, .react-datepicker__day-name { color: white !important; }
        .react-datepicker__day { color: rgba(255,255,255,0.8) !important; border-radius: 8px !important; }
        .react-datepicker-popper { z-index: 9999 !important; }
        
        .react-datepicker__day--disabled, 
        .react-datepicker__day--outside-month {
          color: rgba(255,255,255,0.3) !important;
          cursor: not-allowed !important;
          opacity: 0.5 !important;
        }
        .react-datepicker__day:hover:not(.react-datepicker__day--selected):not(.react-datepicker__day--disabled) {
          background-color: #8BBA82 !important;
          color: white !important;
          border-radius: 50% !important;
        }
        .react-datepicker__day--selected {
          background-color: #8BBA82 !important;
          color: white !important;
          border-radius: 50% !important;
          font-weight: bold;
        }
        .react-datepicker__day--keyboard-selected { 
          background-color: transparent !important; 
        }
      ` }} />
    </main>
  );
}