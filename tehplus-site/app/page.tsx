"use client";
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Manrope, Playfair_Display } from 'next/font/google';

import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ru } from "date-fns/locale";
import { motion, useMotionValue, useSpring, useTransform, useMotionTemplate, Variants } from "framer-motion";

registerLocale("ru", ru);

// Основной строгий шрифт
const manrope = Manrope({ subsets: ['cyrillic', 'latin'], weight: ['400', '500', '600', '700', '800'] });

// Элегантный шрифт с завитушками для акцентов
const playfair = Playfair_Display({ subsets: ['cyrillic', 'latin'], style: ['italic'], weight: ['600'] });
// Указываем тип Variants для каждого объекта:
const fadeInLeft: Variants = { hidden: { opacity: 0, x: -50 }, visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: "easeOut" } } };
const fadeInRight: Variants = { hidden: { opacity: 0, x: 50 }, visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: "easeOut" } } };
const fadeInUp: Variants = { hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" } } };
const zoomIn: Variants = { hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: "easeOut" } } };
const staggerContainer: Variants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.15 } } };
const floatingAnimation = { y: ["-5px", "5px"], transition: { y: { duration: 3.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" } } };

// === КАСТОМНЫЙ КОМПОНЕНТ ДЛЯ 3D МАГНИТНЫХ КАРТОЧЕК (BENTO GRID) ===
const TiltCard = ({ children, className }: { children: React.ReactNode, className?: string }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 20 });
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["8deg", "-8deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-8deg", "8deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    x.set(mouseX / width - 0.5);
    y.set(mouseY / height - 0.5);
  };

  const handleMouseLeave = () => { x.set(0); y.set(0); };

  return (
    <motion.div variants={fadeInUp} style={{ perspective: 1200 }} className="w-full h-full">
      <motion.div onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} style={{ rotateX, rotateY, transformStyle: "preserve-3d" }} className={`w-full h-full relative cursor-default ${className}`}>
        <div style={{ transform: "translateZ(30px)", transformStyle: "preserve-3d" }} className="w-full h-full">{children}</div>
      </motion.div>
    </motion.div>
  );
};

// === КАСТОМНЫЙ КОМПОНЕНТ ДЛЯ УМНЫХ ТАРИФОВ ===
const PricingCard = ({ item, isSelected, onClick }: { item: any, isSelected: boolean, onClick: () => void }) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top } = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - left);
    mouseY.set(e.clientY - top);
  };

  return (
    <motion.div
      variants={fadeInLeft}
      onMouseMove={handleMouseMove}
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      className={`group relative overflow-hidden rounded-[24px] cursor-pointer transition-all duration-500 border ${
        isSelected 
          ? 'bg-white border-[#8BBA82] shadow-[0_12px_40px_rgba(139,186,130,0.25)] ring-1 ring-[#8BBA82]' 
          : 'bg-white/60 backdrop-blur-xl border-[#E8EBE8] hover:border-[#8BBA82]/40 shadow-sm'
      }`}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 group-hover:opacity-100"
        style={{ background: useMotionTemplate`radial-gradient(400px circle at ${mouseX}px ${mouseY}px, rgba(139, 186, 130, 0.15), transparent 80%)` }}
      />
      <div className="relative p-6 md:p-8 flex justify-between items-center z-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className={`px-3 py-1 text-[11px] md:text-xs font-extrabold rounded-lg uppercase tracking-wider transition-colors ${
              isSelected ? 'bg-[#8BBA82] text-white' : 'bg-[#EEF3ED] text-[#8BBA82]'
            }`}>
              {item.cat}
            </span>
            {isSelected && (
              <motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-[#8BBA82] text-[11px] font-extrabold flex items-center gap-1 uppercase tracking-wide">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.2l-3.5-3.5 1.4-1.4L9 13.4l7.1-7.1 1.4 1.4L9 16.2z"/></svg>
                Выбрано
              </motion.span>
            )}
          </div>
          <span className={`font-bold text-[17px] md:text-[19px] transition-colors ${isSelected ? 'text-[#61403A]' : 'text-[#151C2B]'}`}>
            {item.name}
          </span>
        </div>
        <div className="text-2xl md:text-[32px] font-black text-[#8BBA82]">{item.price}</div>
      </div>
    </motion.div>
  );
};

export default function Home() {
  const [formData, setFormData] = useState({
    carNumber: '', phone: '', category: 'M1 Легковые автомобили', date: null as Date | null, time: ''
  });
  const [status, setStatus] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const galleryPhotos = [1, 2, 3, 4, 5];

  const pricingPlans = [
    { id: 'L Мотоциклы', cat: 'L', name: 'Мотоциклы', price: 'от 423 ₽' },
    { id: 'M1 Легковые автомобили', cat: 'M1', name: 'Легковые автомобили', price: 'от 1203 ₽' },
    { id: 'N1 Грузовики (до 3,5т)', cat: 'N1', name: 'Грузовики (до 3,5 т)', price: 'от 1315 ₽' }
  ];

  useEffect(() => {
    window.scrollTo(0, 0);
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname);
  }, []);

  const handleNext = (e?: React.MouseEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    setCurrentPhotoIndex((prev) => (prev + 1) % galleryPhotos.length);
  };

  const handlePrev = (e?: React.MouseEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    setCurrentPhotoIndex((prev) => (prev - 1 + galleryPhotos.length) % galleryPhotos.length);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const getAvailableTimeSlots = () => {
    if (!formData.date) return [];
    const dayOfWeek = formData.date.getDay(); 
    let startHour = (dayOfWeek === 0) ? 10 : 8;
    let endHour = (dayOfWeek === 0) ? 17 : 18;
    const slots = [];
    for (let h = startHour; h < endHour; h++) {
      slots.push(`${h.toString().padStart(2, '0')}:00`);
      slots.push(`${h.toString().padStart(2, '0')}:30`);
    }
    return slots;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.time || !formData.date) { setStatus('Пожалуйста, выберите дату и время визита.'); return; }
    const cleanedNumber = formData.carNumber.replace(/\s+/g, '').toUpperCase();
    const validLetters = 'АВЕКМНОРСТУХABEKMHOPCTYX';
    let isNumberValid = false;

    if (formData.category.includes('Мотоциклы')) {
        isNumberValid = new RegExp(`^\\d{4}[${validLetters}]{2}\\d{2,3}$`).test(cleanedNumber);
    } else {
        isNumberValid = new RegExp(`^[${validLetters}]\\d{3}[${validLetters}]{2}\\d{2,3}$`).test(cleanedNumber);
    }

    if (!isNumberValid) {
        setStatus(formData.category.includes('Мотоциклы') ? '❌ Неверный госномер. Формат: 1234 АА 161' : '❌ Неверный госномер. Формат: А 123 АА 161');
        return;
    }

    setStatus('Отправка...');
    const formattedDate = formData.date.toISOString().split('T')[0];
    
    try {
      const response = await fetch('http://127.0.0.1:8000/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, carNumber: cleanedNumber, date: formattedDate }),
      });
      if (response.ok) {
        setStatus('Заявка успешно отправлена!');
        setFormData({ carNumber: '', phone: '', category: 'M1 Легковые автомобили', date: null, time: '' });
      } else { setStatus('Произошла ошибка. Пожалуйста, проверьте данные.'); }
    } catch (error) { setStatus('Ошибка соединения с сервером.'); }
  };

  const faqs = [
    { q: "Нужны ли аптечка, огнетушитель и знак?", a: "Технический эксперт проверяет машину по списку из 55 параметров. Наличие аптечки, огнетушителя и знака в этом списке нет." },
    { q: "Обязательна ли запись?", a: "Нет, запись не является обязательной. Можем Вас принять в порядке живой очереди." },
    { q: "Можно ли оплатить услуги банковской картой?", a: "Да, мы принимаем оплату наличными, картами любых банков и по QR-коду (СБП). Для юрлиц доступна оплата по счету." },
    { q: "Нужно ли мыть машину перед заездом на линию?", a: "Да, автомобиль должен быть чистым. Особое внимание уделите читаемости номеров и чистоте фар." },
    { q: "Пройду ли я техосмотр с трещиной на лобовом стекле?", a: "Трещины в зоне очистки стеклоочистителя со стороны водителя не допускаются. Если трещина со стороны пассажира — техосмотр пройти можно." }
  ];

  return (
    <main className={`min-h-screen bg-[#F8F9F7] text-[#151C2B] selection:bg-[#8BBA82] selection:text-white overflow-x-hidden relative ${manrope.className}`}>
      
      {/* ФОН (Без анимации пульсации, зафиксирован в максимальной яркости, с усиленными коричневыми волнами) */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8BBA8220_1px,transparent_1px),linear-gradient(to_bottom,#8BBA8220_1px,transparent_1px)] bg-[size:40px_40px]"></div>
        
        {/* Усиленные коричневые волны по бокам */}
        <svg className="absolute top-[5%] left-0 h-[80vh] w-auto opacity-[0.14] text-[#61403A] drop-shadow-2xl" viewBox="0 0 200 800" fill="currentColor">
           <path d="M0,0 C150,120 220,280 150,480 C90,680 40,740 0,800 Z" />
        </svg>
        <svg className="absolute bottom-[0%] right-0 h-[85vh] w-auto opacity-[0.12] text-[#61403A] drop-shadow-2xl" viewBox="0 0 200 800" fill="currentColor">
           <path d="M200,0 C60,140 10,280 90,500 C140,700 180,750 200,800 Z" />
        </svg>

        <svg className="absolute top-[45%] w-[120%] h-auto opacity-[0.08] text-[#61403A] -right-[10%]" viewBox="0 0 1440 320" preserveAspectRatio="none" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M1440,160 C1120,0, 1020,320, 720,160 C420,0, 320,300, 0,160" />
        </svg>

        {/* Статичные яркие цветовые пятна (без animate-pulse) */}
        <div className="absolute top-[-10%] right-[-5%] w-[700px] h-[700px] rounded-full bg-gradient-to-br from-[#8BBA82] to-[#EEF3ED] opacity-65 blur-[90px]"></div>
        <div className="absolute bottom-[10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-[#61403A] to-[#8BBA82] opacity-[0.25] blur-[110px]"></div>
        <div className="absolute top-[35%] left-[-15%] w-[500px] h-[500px] rounded-full bg-[#8BBA82] opacity-35 blur-[90px]"></div>
      </div>

      {/* ШАПКА - ОВАЛЬНАЯ */}
      <motion.header initial={{ y: -100 }} animate={{ y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }} className="fixed top-4 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-[calc(100%-2rem)] max-w-[1400px] z-50 bg-white/75 backdrop-blur-2xl border border-white/80 rounded-[32px] md:rounded-full h-[70px] md:h-[80px] shadow-[0_10px_40px_rgba(0,0,0,0.05)] flex items-center">
        <div className="w-full mx-auto px-5 md:px-8 flex justify-between items-center">
          <div className="text-xl md:text-[26px] font-extrabold tracking-tight text-[#61403A] flex items-center gap-1.5">
            ТЕХПЛЮС<span className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-[#8BBA82] inline-block mb-1"></span>
          </div>
          <nav className="hidden md:flex items-center gap-8 lg:gap-12 text-[15px] font-bold text-[#657080]">
            <a href="#services" className="hover:text-[#151C2B] transition-colors">Услуги</a>
            <a href="#prices" className="hover:text-[#151C2B] transition-colors">Тарифы</a>
            <a href="#booking" className="bg-[#8BBA82]/10 hover:bg-[#8BBA82] text-[#8BBA82] hover:text-white px-4 py-2 rounded-full transition-all">Записаться</a>
            <a href="#faq" className="hover:text-[#151C2B] transition-colors">FAQ</a>
            <a href="#contacts" className="hover:text-[#151C2B] transition-colors">Контакты</a>
          </nav>
          <a href="tel:+70000000000" className="flex items-center gap-2 bg-[#F8F9F7] border border-[#E8EBE8] hover:bg-[#EEF3ED] text-[#151C2B] font-bold text-sm md:text-base px-4 py-2 md:px-5 md:py-2.5 rounded-full transition-colors whitespace-nowrap">
            <svg className="w-4 h-4 text-[#8BBA82]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
            +7 (988) 255-65-47
          </a>
        </div>
      </motion.header>

      {/* ПЕРВЫЙ ЭКРАН */}
      <section className="relative pt-[150px] pb-16 md:pt-[190px] md:pb-24 px-6 md:px-12 max-w-[1440px] mx-auto grid md:grid-cols-[45%_55%] gap-10 md:gap-14 items-center z-10 overflow-hidden">
        
        {/* Левая колонка */}
        <motion.div initial="hidden" animate="visible" variants={fadeInLeft} className="space-y-6 md:space-y-6 pr-0 md:pr-4">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white border border-[#E8EBE8] text-[#151C2B] text-xs md:text-sm font-bold shadow-sm relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#8BBA82]"></div>
            <svg className="w-4 h-4 text-[#8BBA82] ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
            Аккредитация РСА: № [ХХХХХ]
          </div>
          
          <h1 className="text-[42px] sm:text-[54px] md:text-[66px] font-bold tracking-tight leading-[1.1] text-[#151C2B]">
            Официальный <br className="hidden sm:block"/>
            <span className={`${playfair.className} text-[#61403A] text-[56px] sm:text-[72px] md:text-[88px] font-semibold leading-[0.9] block pt-3 pb-4 drop-shadow-sm`}>
              техосмотр
            </span>
            в Ростове
          </h1>
          
          <p className="text-[17px] md:text-[19px] text-[#657080] max-w-md leading-relaxed font-medium">
            Аккредитованный пункт. Моментальная передача данных в ЕАИСТО для успешной регистрации в ГИБДД. Выполним работу за 30 минут. 200 метров до МРЭО.
          </p>
          
          <div className="flex flex-col xl:flex-row items-start xl:items-center gap-6 pt-4">
            <a href="#booking" className="bg-[#8BBA82] hover:bg-[#77a66f] text-white font-bold py-5 px-9 rounded-full flex items-center gap-3 transition-all shadow-[0_10px_30px_rgba(139,186,130,0.4)] hover:-translate-y-1 w-full xl:w-auto justify-center group text-[17px] relative z-20">
              Выбрать время
              <span className="bg-white text-[#8BBA82] w-8 h-8 rounded-full flex items-center justify-center group-hover:translate-x-1 transition-transform">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
              </span>
            </a>
            
            <div className="flex items-center gap-5 bg-gradient-to-br from-white/60 to-white/10 backdrop-blur-2xl px-7 py-5 rounded-[24px] border border-white/80 shadow-[0_12px_40px_rgba(30,40,30,0.08)] relative overflow-hidden group w-full xl:w-auto">
               <div className="absolute left-0 top-0 bottom-0 w-2 bg-[#8BBA82]"></div>
               <div className="w-14 h-14 rounded-full bg-white/70 backdrop-blur-md flex items-center justify-center text-[#8BBA82] shrink-0 group-hover:scale-110 transition-transform shadow-sm border border-white/60 relative z-10">
                 <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               </div>
               <div className="font-semibold text-[#151C2B] leading-snug relative z-10">
                 <div className="text-[#61403A] font-black mb-1.5 text-[14px] uppercase tracking-wider">Режим работы</div>
                 <div className="text-[17px] mb-0.5">Пн–Сб: <span className="text-[#151C2B]/70 font-medium">8:00 – 18:00</span></div>
                 <div className="text-[17px]">Вс: <span className="text-[#151C2B]/70 font-medium">10:00 – 17:00</span></div>
               </div>
            </div>
          </div>
        </motion.div>
        
        {/* Правая колонка: Фотография */}
        <motion.div initial="hidden" animate="visible" variants={fadeInRight} className="relative w-full h-[450px] md:h-[650px] mt-8 md:mt-0 isolate -ml-4 md:-ml-8">
           <svg width="0" height="0" className="absolute">
             <defs>
               <clipPath id="organic-hero" clipPathUnits="objectBoundingBox">
                 <path d="M 0.15,0 L 0.92,0 C 0.97,0, 1,0.03, 1,0.08 L 1,0.92 C 1,0.97, 0.97,1, 0.92,1 L 0.15,1 C 0.05,1, 0.05,0.9, 0.08,0.8 C 0.15,0.6, 0.00,0.4, 0.08,0.2 C 0.12,0.1, 0.08,0, 0.15,0 Z" />
               </clipPath>
             </defs>
           </svg>

           <div className="relative w-full h-full z-10" style={{ filter: 'drop-shadow(0 20px 40px rgba(97,64,58,0.15))' }}>
             <div className="absolute inset-0 bg-[#61403A] -translate-x-3 translate-y-4 md:-translate-x-5 md:translate-y-6 z-0" style={{ clipPath: 'url(#organic-hero)', WebkitClipPath: 'url(#organic-hero)' }}></div>
             <div className="w-full h-full relative z-10 bg-gray-100" style={{ clipPath: 'url(#organic-hero)', WebkitClipPath: 'url(#organic-hero)' }}>
               <Image src="/hero.png" alt="Фасад пункта техосмотра" fill className="object-cover object-[25%_center] z-0 brightness-105 saturate-[1.10]" priority />
             </div>
           </div>
           
           <div className="absolute top-8 right-8 bg-gradient-to-br from-white/50 to-white/10 backdrop-blur-2xl px-5 py-3.5 rounded-[24px] shadow-[0_8px_32px_rgba(0,0,0,0.12)] flex items-center gap-4 z-20 border border-white/60">
             <div className="bg-white/60 p-2.5 rounded-full text-[#8BBA82] backdrop-blur-md shadow-sm border border-white/60">
               <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
             </div>
             <div className="flex flex-col drop-shadow-[0_2px_10px_rgba(255,255,255,0.8)]">
               <span className="text-[#151C2B] font-extrabold text-[15px] leading-tight">Ростов-на-Дону</span>
               <span className="text-[#151C2B]/90 font-bold text-[13px] mt-0.5">ул. Доватора, 271</span>
             </div>
           </div>

           <div className="absolute bottom-8 right-8 bg-gradient-to-br from-white/50 to-white/10 backdrop-blur-2xl px-6 py-4 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.12)] flex items-center gap-3 z-20 border border-white/60">
             <div className="bg-white/60 p-2 rounded-full backdrop-blur-md border border-white/60 shadow-sm">
                <svg className="w-4 h-4 text-[#61403A]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
             </div>
             <span className="text-[#151C2B] font-extrabold text-sm drop-shadow-[0_2px_10px_rgba(255,255,255,0.8)] tracking-wide">Быстро • Надёжно • Официально</span>
           </div>
        </motion.div>
      </section>

      {/* БЛОК ПРЕИМУЩЕСТВ - BENTO GRID + 3D TILT */}
      <section id="services" className="scroll-mt-32 py-12 md:py-16 max-w-[1140px] mx-auto px-6 md:px-12 relative z-10">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeInUp} className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
             <div className="h-px bg-[#E8EBE8] w-12 md:w-24"></div>
             <div className="w-10 h-10 rounded-full border border-[#E8EBE8] flex items-center justify-center text-[#8BBA82] bg-white shadow-sm"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg></div>
             <div className="h-px bg-[#E8EBE8] w-12 md:w-24"></div>
          </div>
          <h2 className="text-[32px] md:text-[40px] font-extrabold text-[#61403A] tracking-tight">Все для постановки <span className="text-[#8BBA82]">на учет</span></h2>
        </motion.div>
        
        {/* УМЕНЬШЕННАЯ СЕТКА BENTO GRID */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          
          <div className="lg:col-span-2 h-[260px] md:h-auto">
            <TiltCard className="bg-gradient-to-br from-[#9DC895] to-[#8BBA82] rounded-[24px] md:rounded-[32px] p-6 md:p-8 shadow-lg border border-[#8BBA82]/30 flex flex-col md:flex-row items-center justify-between overflow-hidden relative">
               <div className="absolute top-[-50%] left-[-10%] w-[300px] h-[300px] bg-white/20 rounded-full blur-[60px] pointer-events-none"></div>
               <div className="relative z-10 w-full md:w-2/3 text-left">
                  <h3 className="text-[22px] md:text-[30px] font-extrabold text-white leading-tight mb-5 tracking-tight uppercase drop-shadow-sm">Всё, что нужно от вас:</h3>
                  <ul className="text-white font-semibold text-[15px] md:text-[19px] leading-relaxed space-y-3">
                     <li className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-[16px] border border-white/20 shadow-sm">
                        <span className="w-8 h-8 rounded-full bg-white text-[#8BBA82] flex items-center justify-center shrink-0 shadow-md font-black text-base">1</span>
                        Документ, удостоверяющий личность
                     </li>
                     <li className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-3 rounded-[16px] border border-white/20 shadow-sm">
                        <span className="w-8 h-8 rounded-full bg-white text-[#8BBA82] flex items-center justify-center shrink-0 shadow-md font-black text-base">2</span>
                        Свидетельство о регистрации ТС или ПТС
                     </li>
                  </ul>
               </div>
               {/* Иконка в правом нижнем углу карточки */}
              <div className="absolute bottom-6 right-6 hidden md:flex items-center justify-center z-10 pointer-events-none">
                  <div className="w-24 h-24 md:w-28 md:h-28 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/30 shadow-md">
                    <svg className="w-12 h-12 md:w-14 md:h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
              </div>
            </TiltCard>
          </div>

          <div className="lg:col-span-1 h-full">
            <TiltCard className="bg-white rounded-[24px] md:rounded-[32px] p-6 md:p-8 shadow-[0_8px_30px_rgba(30,40,30,0.04)] border border-[#E8EBE8]/80 flex flex-col justify-center items-start group">
               <div className="w-[48px] h-[48px] rounded-xl bg-[#EEF3ED] text-[#8BBA82] flex items-center justify-center mb-4 shadow-sm border border-[#8BBA82]/10 group-hover:bg-[#8BBA82] group-hover:text-white transition-colors duration-500">
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               </div>
               <h3 className="font-extrabold text-[20px] md:text-[22px] text-[#61403A] mb-2 leading-tight">Сделаем за <br/><span className="text-[#8BBA82]">30 минут</span></h3>
               <p className="text-[#657080] font-medium text-[14px] leading-relaxed">Ценим ваше время. Строго соблюдаем регламент.</p>
            </TiltCard>
          </div>

          <div className="lg:col-span-1 h-full">
            <TiltCard className="bg-white rounded-[24px] md:rounded-[32px] p-6 md:p-8 shadow-[0_8px_30px_rgba(30,40,30,0.04)] border border-[#E8EBE8]/80 flex flex-col justify-center items-start group relative overflow-hidden">
               <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                 <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
               </div>
               <div className="w-[48px] h-[48px] rounded-xl bg-[#EEF3ED] text-[#8BBA82] flex items-center justify-center mb-4 shadow-sm border border-[#8BBA82]/10 group-hover:bg-[#8BBA82] group-hover:text-white transition-colors duration-500 relative z-10">
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
               </div>
               <h3 className="font-extrabold text-[20px] md:text-[22px] text-[#61403A] mb-2 leading-tight relative z-10">200 метров <br/>до МРЭО</h3>
               <p className="text-[#657080] font-medium text-[14px] leading-relaxed relative z-10">Идеальное расположение. Диагностика прямо у ГИБДД.</p>
            </TiltCard>
          </div>

          <div className="lg:col-span-2 h-full">
            <TiltCard className="bg-[#61403A] rounded-[24px] md:rounded-[32px] p-6 md:p-8 shadow-xl border border-white/10 flex flex-col md:flex-row items-center justify-between overflow-hidden group">
              <div className="absolute right-[-10%] top-[-20%] w-64 h-64 bg-[#8BBA82]/20 rounded-full blur-[60px] pointer-events-none group-hover:bg-[#8BBA82]/40 transition-colors duration-700"></div>
              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-5 w-full">
                <div className="w-[64px] h-[64px] rounded-[16px] bg-white/10 border border-white/20 text-[#8BBA82] flex items-center justify-center shrink-0 backdrop-blur-md shadow-inner">
                   <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                </div>
                <div>
                  <h3 className="font-extrabold text-[22px] md:text-[26px] text-white mb-2 leading-tight tracking-wide drop-shadow-sm">Официально в ЕАИСТО</h3>
                  <p className="text-white/80 font-medium text-[14px] md:text-[15px] leading-relaxed max-w-sm">Моментально вносим данные в единую базу без задержек и очередей.</p>
                </div>
              </div>
            </TiltCard>
          </div>

          <div className="lg:col-span-1 h-full">
            <TiltCard className="bg-white rounded-[24px] p-5 shadow-[0_8px_30px_rgba(30,40,30,0.04)] border border-[#E8EBE8]/80 flex items-center gap-4 group">
               <div className="w-[44px] h-[44px] rounded-xl bg-[#EEF3ED] text-[#8BBA82] flex items-center justify-center shrink-0 shadow-sm group-hover:bg-[#8BBA82] group-hover:text-white transition-colors duration-300">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               </div>
               <div>
                 <h3 className="font-extrabold text-[15px] md:text-[16px] text-[#61403A] mb-1 leading-tight">Категории L, M1, N1</h3>
                 <p className="text-[#657080] font-medium text-[12px] leading-snug">Любые автомобили и мотоциклы.</p>
               </div>
            </TiltCard>
          </div>

          <div className="lg:col-span-1 h-full">
            <TiltCard className="bg-white rounded-[24px] p-5 shadow-[0_8px_30px_rgba(30,40,30,0.04)] border border-[#E8EBE8]/80 flex items-center gap-4 group">
               <div className="w-[44px] h-[44px] rounded-xl bg-[#EEF3ED] text-[#8BBA82] flex items-center justify-center shrink-0 shadow-sm group-hover:bg-[#8BBA82] group-hover:text-white transition-colors duration-300">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
               </div>
               <div>
                 <h3 className="font-extrabold text-[15px] md:text-[16px] text-[#61403A] mb-1 leading-tight">Оформление ОСАГО</h3>
                 <p className="text-[#657080] font-medium text-[12px] leading-snug">Подберем полис прямо на месте.</p>
               </div>
            </TiltCard>
          </div>

          <div className="lg:col-span-1 h-full">
            <TiltCard className="bg-white rounded-[24px] p-5 shadow-[0_8px_30px_rgba(30,40,30,0.04)] border border-[#E8EBE8]/80 flex items-center gap-4 group">
               <div className="w-[44px] h-[44px] rounded-xl bg-[#EEF3ED] text-[#8BBA82] flex items-center justify-center shrink-0 shadow-sm group-hover:bg-[#8BBA82] group-hover:text-white transition-colors duration-300">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
               </div>
               <div>
                 <h3 className="font-extrabold text-[15px] md:text-[16px] text-[#61403A] mb-1 leading-tight">Новые госномера</h3>
                 <p className="text-[#657080] font-medium text-[12px] leading-snug">Изготовим дубликаты за 5 минут.</p>
               </div>
            </TiltCard>
          </div>

        </motion.div>
      </section>

      {/* НОВЫЙ БЛОК: ЗАКОН И БЕЗОПАСНОСТЬ (ПЕРЕД ГАЛЕРЕЕЙ) */}
      <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeInUp} className="py-16 md:py-24 max-w-[1140px] mx-auto px-6 md:px-12 relative z-10 border-t border-[#E8EBE8]/50">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-4">
             <div className="h-px bg-[#E8EBE8] w-12 md:w-24"></div>
             <div className="w-10 h-10 rounded-full border border-[#E8EBE8] flex items-center justify-center text-[#8BBA82] bg-white shadow-sm">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
             </div>
             <div className="h-px bg-[#E8EBE8] w-12 md:w-24"></div>
          </div>
          <h2 className="text-[32px] md:text-[42px] font-extrabold text-[#61403A] tracking-tight">
            Почему техосмотр — это <span className={`${playfair.className} font-semibold text-[#8BBA82]`}>обязательно</span>?
          </h2>
          <p className="text-[#657080] mt-3 font-medium text-[16px] max-w-2xl mx-auto">
            Диагностическая карта — это гарантия исправности ключевых узлов вашего автомобиля и требование законодательства РФ.
          </p>
        </div>

        {/* Сетка блока законов и штрафов */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Карточка 1: Почему это важно (Безопасность) */}
          <TiltCard className="bg-white rounded-[32px] p-8 md:p-10 shadow-sm border border-[#E8EBE8] flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#8BBA82]/10 rounded-full blur-3xl pointer-events-none"></div>
            <div>
              <div className="w-14 h-14 rounded-2xl bg-[#EEF3ED] text-[#8BBA82] flex items-center justify-center mb-6 shadow-sm border border-[#8BBA82]/20">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
              </div>
              <h3 className="font-extrabold text-[22px] text-[#61403A] mb-3">Ваша безопасность на дороге</h3>
              <p className="text-[#657080] font-medium text-[15px] leading-relaxed mb-6">
                На диагностической линии проверяется свыше 55 параметров: тормозная система, рулевое управление, световые приборы и подвеска. Своевременный осмотр предотвращает аварийные ситуации.
              </p>
            </div>
            <div className="pt-4 border-t border-[#E8EBE8]/60 flex items-center justify-between text-sm font-bold text-[#8BBA82]">
              <span>Защитите себя и близких</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            </div>
          </TiltCard>

          {/* Карточка 2: Штрафы и ответственность */}
          <TiltCard className="bg-[#61403A] rounded-[32px] p-8 md:p-10 shadow-xl text-white flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-[#8BBA82]/20 rounded-full blur-3xl pointer-events-none"></div>
            <div>
              <div className="w-14 h-14 rounded-2xl bg-white/10 text-[#8BBA82] flex items-center justify-center mb-6 backdrop-blur-md border border-white/20">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              </div>
              <h3 className="font-extrabold text-[22px] text-white mb-4">Штрафы за отсутствие ТО</h3>
              
              <div className="space-y-3 mb-6">
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15">
                  <div className="text-xs uppercase font-extrabold text-[#8BBA82] mb-1">Для обычных граждан</div>
                  <div className="text-[15px] font-semibold text-white/90">Штраф от <strong>2 000 до 5 000 рублей</strong> (при проверке сотрудниками ДПС для отдельных категорий транспорта).</div>
                </div>
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15">
                  <div className="text-xs uppercase font-extrabold text-[#8BBA82] mb-1">Для юридических лиц</div>
                  <div className="text-[15px] font-semibold text-white/90">Штрафы для организаций и должностных лиц могут достигать <strong>50 000 рублей</strong>.</div>
                </div>
              </div>
            </div>

            {/* Ссылки на статьи с переходом на внешний сайт */}
            <div className="pt-4 border-t border-white/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs font-bold">
               <span className="text-white/60">Нормативная база:</span>
               <div className="flex items-center gap-3">
                 <a 
                   href="https://www.consultant.ru/document/cons_doc_LAW_34661/fa21e6efbc72793ef1ef868ef4ae90d81ef3b584/" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="text-[#8BBA82] hover:text-white underline underline-offset-4 transition-colors"
                 >
                   ст. 12.1 КоАП РФ ↗
                 </a>
                 <a 
                   href="https://www.consultant.ru/document/cons_doc_LAW_34661/28236d2e66fc03e945fa671400f9116c4f039369/" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   className="text-[#8BBA82] hover:text-white underline underline-offset-4 transition-colors"
                 >
                   ст. 12.5 КоАП РФ ↗
                 </a>
               </div>
            </div>
          </TiltCard>

        </div>
      </motion.section>

      {/* 3D ГАЛЕРЕЯ */}
      <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeInUp} className="py-16 md:py-24 overflow-hidden relative z-10 border-t border-[#E8EBE8]/50">
        <div className="max-w-[1440px] mx-auto px-6 mb-10 md:mb-12 text-center">
          <h2 className="text-[32px] md:text-[49px] font-extrabold text-[#61403A] tracking-tight">
            Наша <span className={`${playfair.className} font-semibold text-[#61403A]`}>галерея</span>
          </h2>
        </div>

        <div className="relative w-full max-w-[1440px] mx-auto h-[250px] sm:h-[350px] md:h-[500px] flex items-center justify-center">
          <button type="button" onClick={handlePrev} className="absolute left-2 md:left-[calc(50%-380px)] top-1/2 -translate-y-1/2 z-[100] text-[#61403A] drop-shadow-md hover:scale-110 transition-transform duration-200 cursor-pointer p-2 md:p-4 focus:outline-none">
            <svg className="w-10 h-10 md:w-16 md:h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
          </button>
          
          <button type="button" onClick={handleNext} className="absolute right-2 md:right-[calc(50%-380px)] top-1/2 -translate-y-1/2 z-[100] text-[#61403A] drop-shadow-md hover:scale-110 transition-transform duration-200 cursor-pointer p-2 md:p-4 focus:outline-none">
            <svg className="w-10 h-10 md:w-16 md:h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
          </button>

          <div className="relative w-full max-w-5xl h-full flex items-center justify-center pointer-events-none">
            {galleryPhotos.map((item, index) => {
              const isCurrent = index === currentPhotoIndex;
              const isPrev = index === (currentPhotoIndex - 1 + galleryPhotos.length) % galleryPhotos.length;
              const isNext = index === (currentPhotoIndex + 1) % galleryPhotos.length;
              let positionClasses = "opacity-0 scale-75 z-0"; 
              if (isCurrent) positionClasses = "translate-x-0 scale-100 z-30 opacity-100 blur-none shadow-2xl pointer-events-auto cursor-default";
              else if (isPrev) positionClasses = "-translate-x-[40%] md:-translate-x-[60%] scale-[0.85] z-20 opacity-60 blur-[4px] cursor-pointer hover:opacity-100 pointer-events-auto";
              else if (isNext) positionClasses = "translate-x-[40%] md:translate-x-[60%] scale-[0.85] z-20 opacity-60 blur-[4px] cursor-pointer hover:opacity-100 pointer-events-auto";

              return (
                <div key={item} onClick={() => { if (isPrev) handlePrev(); if (isNext) handleNext(); }}
                  className={`absolute w-[75%] sm:w-[65%] md:w-[600px] h-[90%] bg-gray-100 rounded-3xl border border-gray-200 flex items-center justify-center text-gray-400 transition-all duration-700 ease-out overflow-hidden ${positionClasses}`}>
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-200 rounded-3xl"></div>
                  <span className="relative z-10 text-xl md:text-2xl font-bold text-[#657080]">Фото {item}</span>
                </div>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* ТАРИФЫ И ФОРМА БРОНИРОВАНИЯ */}
      <section className="relative z-10 pb-16 md:pb-24 overflow-hidden">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 grid lg:grid-cols-2 gap-12 md:gap-20 items-start">
          
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer} className="space-y-6">
            <div>
              <motion.h2 variants={fadeInLeft} id="prices" className="scroll-mt-32 text-[36px] md:text-[46px] font-extrabold text-[#61403A] tracking-tight mb-2">Выберите тариф</motion.h2>
              <motion.p variants={fadeInLeft} className="text-[#657080] font-medium text-[15px]">Нажмите на нужную категорию, чтобы перейти к бронированию.</motion.p>
            </div>
            
            <div className="space-y-4 relative group/cards">
              {pricingPlans.map((item) => (
                <PricingCard 
                  key={item.id} 
                  item={item} 
                  isSelected={formData.category === item.id} 
                  onClick={() => setFormData(prev => ({ ...prev, category: item.id }))} 
                />
              ))}
            </div>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={zoomIn} id="booking" className="scroll-mt-32 bg-[#61403A] p-6 md:p-12 rounded-[40px] text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
            <div className="relative z-10">
              <h2 className="text-2xl md:text-3xl font-extrabold mb-2 md:mb-3">Бронирование времени</h2>
              <p className="text-[#8BBA82] mb-8 md:mb-10 font-medium opacity-90 text-sm md:text-base">
                Выберите удобное время, и мы закрепим его за вашим автомобилем.
              </p>
              
              <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
                <div>
                  <label className="block text-[10px] md:text-xs font-bold uppercase tracking-wider text-white/60 mb-2 pl-1">Номер машины</label>
                  <input required type="text" name="carNumber" value={formData.carNumber} onChange={handleChange}
                    className="w-full p-4 md:p-5 bg-white/10 border border-white/20 rounded-[20px] text-white placeholder-white/30 focus:outline-none focus:border-[#8BBA82] focus:bg-white/20 uppercase text-sm md:text-base transition-all" placeholder="А 123 АА 161" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                  <div>
                    <label className="block text-[10px] md:text-xs font-bold uppercase tracking-wider text-white/60 mb-2 pl-1">Телефон</label>
                    <input required type="tel" name="phone" value={formData.phone} onChange={handleChange}
                      className="w-full p-4 md:p-5 bg-white/10 border border-white/20 rounded-[20px] text-white placeholder-white/30 focus:outline-none focus:border-[#8BBA82] focus:bg-white/20 text-sm md:text-base transition-all" placeholder="+7 (___) ___-__-__" />
                  </div>
                  <div>
                    <label className="block text-[10px] md:text-xs font-bold uppercase tracking-wider text-white/60 mb-2 pl-1">Категория (Синхронизировано)</label>
                    <select name="category" value={formData.category} onChange={handleChange}
                      className="w-full p-4 md:p-5 bg-[#8BBA82]/20 border border-[#8BBA82] rounded-[20px] text-white focus:outline-none focus:border-white text-sm md:text-base appearance-none transition-all cursor-pointer">
                      <option value="M1 Легковые автомобили">M1 Легковые авто</option>
                      <option value="L Мотоциклы">L Мотоциклы</option>
                      <option value="N1 Грузовики (до 3,5т)">N1 Грузовики (до 3,5 т)</option>
                    </select>
                  </div>
                </div>

                <div>
                   <label className="block text-[10px] md:text-xs font-bold uppercase tracking-wider text-white/60 mb-2 pl-1">Выберите день</label>
                   <DatePicker
                     selected={formData.date}
                     onChange={(date: Date | null) => setFormData(prev => ({ ...prev, date, time: '' }))}
                     locale="ru"
                     dateFormat="dd MMMM yyyy"
                     minDate={new Date()}
                     placeholderText="Нажмите для выбора даты"
                     className="w-full p-4 md:p-5 bg-white/10 border border-white/20 rounded-[20px] text-white placeholder-white/50 focus:outline-none focus:border-[#8BBA82] focus:bg-white/20 text-sm md:text-[17px] font-bold cursor-pointer transition-all"
                     wrapperClassName="w-full"
                   />
                </div>

                {formData.date && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.4 }}>
                     <label className="block text-[10px] md:text-xs font-bold uppercase tracking-wider text-white/60 mb-3 pl-1 mt-4">Доступные слоты</label>
                     <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 md:gap-3 max-h-56 md:max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                        {getAvailableTimeSlots().map(slot => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, time: slot }))}
                            className={`py-3 md:py-2 px-1 md:px-2 text-sm md:text-base font-bold rounded-xl border transition-all whitespace-nowrap ${
                              formData.time === slot 
                                ? 'bg-[#8BBA82] border-[#8BBA82] text-white shadow-lg scale-105' 
                                : 'bg-transparent border-white/20 text-white hover:border-[#8BBA82] hover:bg-white/5'
                            }`}
                          >
                            {slot}
                          </button>
                        ))}
                     </div>
                  </motion.div>
                )}
                
                <button type="submit" disabled={!formData.time} className={`w-full font-bold py-5 rounded-[20px] mt-4 transition-all shadow-lg text-[17px] ${formData.time ? 'bg-[#8BBA82] hover:bg-[#77a66f] text-white shadow-[#8BBA82]/30 hover:-translate-y-1' : 'bg-white/10 text-white/40 cursor-not-allowed shadow-none'}`}>
                  {formData.time ? 'Забронировать визит' : 'Выберите дату и время'}
                </button>
                
                {status && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`p-4 rounded-[16px] border mt-4 ${status.includes('успешно') ? 'bg-[#8BBA82]/20 border-[#8BBA82]/50 text-[#8BBA82]' : 'bg-red-500/20 border-red-500/50 text-red-200'} text-center text-sm font-medium`}>{status}</motion.div>
                )}
              </form>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ - С ПРЕМИАЛЬНЫМ SPLIT-ДИЗАЙНОМ В СТИЛЕ APPLE */}
      <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={fadeInUp} id="faq" className="scroll-mt-32 py-16 md:py-24 max-w-[1360px] mx-auto px-6 md:px-19 relative z-10">
        <div className="grid lg:grid-cols-[35%_65%] gap-10 md:gap-16 items-start">
          
          {/* Левая колонка: Заголовок */}
          <div className="lg:sticky lg:top-32 space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EEF3ED] text-[#8BBA82] text-xs font-extrabold uppercase tracking-wider">
              Помощь и ответы
            </div>
            <h2 className={`text-[38px] sm:text-[46px] md:text-[54px] font-bold text-[#61403A] tracking-tight leading-[1.05]`}>
              Часто задаваемые<br/>
              <span className={playfair.className}>вопросы</span>
            </h2>
            <p className="text-[#657080] font-medium text-[16px] leading-relaxed max-w-sm">
              Мы собрали ответы на самые популярные вопросы о прохождении техосмотра, документах и оплате.
            </p>
          </div>

          {/* Правая колонка: Список вопросов */}
          <div className="space-y-4">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <motion.div 
                  key={index} 
                  initial={false}
                  animate={{ backgroundColor: isOpen ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.6)' }}
                  className="backdrop-blur-xl border border-[#E8EBE8] rounded-[24px] overflow-hidden shadow-sm hover:border-[#8BBA82]/40 transition-all duration-300"
                >
                  <button 
                    onClick={() => setOpenFaq(isOpen ? null : index)} 
                    className="w-full px-6 py-6 text-left flex justify-between items-center focus:outline-none cursor-pointer"
                  >
                    <span className="font-extrabold text-[#151C2B] text-[17px] md:text-[19px] pr-4">{faq.q}</span>
                    <div className={`w-10 h-10 rounded-full border flex items-center justify-center flex-shrink-0 transition-all duration-300 ${isOpen ? 'rotate-180 bg-[#8BBA82] border-[#8BBA82] text-white shadow-md' : 'border-[#E8EBE8] text-[#8BBA82] bg-white'}`}>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </button>
                  <motion.div 
                    initial={false}
                    animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden px-6"
                  >
                    <p className="text-[#657080] font-medium leading-relaxed text-[16px] pb-6">{faq.a}</p>
                  </motion.div>
                </motion.div>
              );
            })}
          </div>

        </div>
      </motion.section>

      {/* КОНТАКТЫ (С НЕОБЫЧНОЙ ВОЛНИСТОЙ ФОРМОЙ) */}
      <motion.section initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={fadeInUp} id="contacts" className="scroll-mt-32 py-16 md:py-24 max-w-[1440px] mx-auto px-6 md:px-12 relative z-10 overflow-hidden">
        
        {/* SVG маска для органической волнистой формы блока контактов */}
        <svg width="0" height="0" className="absolute">
          <defs>
            <clipPath id="organic-contacts" clipPathUnits="objectBoundingBox">
              <path d="M 0.03,0.05 
                       C 0.1,0.02, 0.9,0.01, 0.97,0.04 
                       C 1,0.15, 0.98,0.85, 0.96,0.95 
                       C 0.9,0.98, 0.1,0.99, 0.04,0.96 
                       C 0.01,0.85, 0.02,0.15, 0.03,0.05 
                       Z" />
            </clipPath>
          </defs>
        </svg>

        {/* Обертка с органическим скруглением и тенью */}
        <div className="relative p-2 md:p-6" style={{ clipPath: 'url(#organic-contacts)', WebkitClipPath: 'url(#organic-contacts)' }}>
          
          <div className="grid lg:grid-cols-3 gap-8 md:gap-12 bg-white/80 backdrop-blur-2xl p-8 md:p-14 border border-white shadow-2xl">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInLeft} className="lg:col-span-1 flex flex-col justify-between space-y-10 bg-white p-8 md:p-10 rounded-[32px] border border-[#E8EBE8] shadow-sm">
              <div>
                <h2 className="text-[32px] font-extrabold text-[#61403A] mb-8 tracking-tight">Ждем вас</h2>
                <div className="space-y-7 text-[#657080]">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-[#8BBA82] mb-2">Адрес СТО</div>
                    <div className="font-bold text-[#151C2B] leading-snug text-[16px]">344090, Ростовская обл.,<br/>г. Ростов-на-Дону,<br/>ул. Доватора, д. 271, стр. 1</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-[#8BBA82] mb-2">Часы работы</div>
                    <div className="font-bold text-[#151C2B] text-[16px] leading-snug">Пн - Сб • 8:00 - 18:00<br/>Вс • 10:00 - 17:00</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-[#8BBA82] mb-2">Связь</div>
                    <a href="tel:+70000000000" className="font-black text-[24px] md:text-[26px] text-[#61403A] block hover:text-[#8BBA82] transition-colors mb-1">+7 (988) 255-65-47</a>
                    <a href="mailto:tekhplus@yandex.ru" className="font-bold text-[#657080] hover:text-[#8BBA82] transition-colors text-[16px]">tekhplus@yandex.ru</a>
                  </div>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-[#E8EBE8]">
                <a href="https://yandex.ru/maps/?rtext=~Ростов-на-Дону,+улица+Доватора,+271с1&rtt=auto" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 bg-[#EEF3ED] hover:bg-[#8BBA82] text-[#8BBA82] hover:text-white font-extrabold py-4 px-6 rounded-full transition-all w-full text-[16px] group">
                  <svg className="w-5 h-5 group-hover:animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                  Построить маршрут
                </a>
              </div>
            </motion.div>
            
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInRight} className="lg:col-span-2 h-[400px] md:h-auto min-h-[450px] bg-[#E8EBE8] rounded-[32px] overflow-hidden relative shadow-sm border border-[#E8EBE8]">
               <iframe src="https://yandex.ru/map-widget/v1/?um=constructor%3A009b3fe9901a3701834297769ac0653821d629ea2a870450b2fdf9bd86a0c8be&source=constructor" className="absolute inset-0 w-full h-full z-10 border-0" allowFullScreen={true}></iframe>
            </motion.div>
          </div>

        </div>
      </motion.section>
      
      {/* ФУТЕР */}
      <motion.footer initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp} className="bg-white border-t border-[#E8EBE8] text-[#657080] py-10 text-[14px] relative z-10 font-medium">
        <div className="max-w-[1440px] mx-auto px-6 md:px-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
             <p className="text-[#151C2B] font-extrabold text-[15px]">ООО "ТЕХПЛЮС" • ИНН 6168125681 • ОГРН 1256100025697</p>
             <p>Адрес: 344090, Ростовская обл., г. Ростов-на-Дону, ул. Доватора, д. 271, стр. 1</p>
          </div>
          <div className="md:text-right space-y-2 border-t border-[#E8EBE8] w-full md:w-auto pt-6 md:border-none md:pt-0">
             <p>© Copyright 2026 • <a href="http://техосмотр-на-доватора.рф" className="hover:text-[#8BBA82] transition-colors underline decoration-[#E8EBE8] underline-offset-4">http://техосмотр-на-доватора.рф</a></p>
             <p><a href="#" className="hover:text-[#8BBA82] transition-colors underline decoration-[#E8EBE8] underline-offset-4">Политика конфиденциальности</a></p>
          </div>
        </div>
      </motion.footer>

      {/* КАСТОМНЫЕ СТИЛИ */}
      <style dangerouslySetInnerHTML={{__html: `
        html { scroll-behavior: smooth; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.3); border-radius: 10px; }
        
        /* Стилизация библиотеки календаря */
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
        .react-datepicker__day:hover { background-color: rgba(139,186,130,0.4) !important; }
        .react-datepicker__day--selected { background-color: #8BBA82 !important; color: white !important; font-weight: bold; }
        .react-datepicker__day--keyboard-selected { background-color: transparent !important; }
      `}} />
    </main>
  );
}