"use client";
import React, { useState, useEffect } from 'react';
import Image from 'next/image';

export default function Home() {
  const [formData, setFormData] = useState({
    carNumber: '', 
    phone: '', 
    category: 'M1 Легковые автомобили', 
    date: '',
    time: ''
  });
  const [status, setStatus] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const galleryPhotos = [1, 2, 3, 4, 5];
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

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
    if (e.target.name === 'date') {
        setFormData(prev => ({ ...prev, time: '' }));
    }
  };

  const getAvailableTimeSlots = () => {
    if (!formData.date) return [];
    
    const selectedDate = new Date(formData.date);
    const dayOfWeek = selectedDate.getDay(); 
    
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
    
    // 1. Проверка времени
    if (!formData.time) {
        setStatus('Пожалуйста, выберите время визита.');
        return;
    }

    // 2. Умная валидация госномера
    // Убираем все пробелы и переводим в верхний регистр
    const cleanedNumber = formData.carNumber.replace(/\s+/g, '').toUpperCase();
    
    // Разрешаем кириллицу и похожую на нее латиницу
    const validLetters = 'АВЕКМНОРСТУХABEKMHOPCTYX';
    let isNumberValid = false;

    if (formData.category.includes('Мотоциклы')) {
        // ГОСТ для мотоциклов: 4 цифры, 2 буквы, регион (например: 1234 АА 161)
        const motoRegex = new RegExp(`^\\d{4}[${validLetters}]{2}\\d{2,3}$`);
        isNumberValid = motoRegex.test(cleanedNumber);
    } else {
        // ГОСТ для авто и грузовиков: 1 буква, 3 цифры, 2 буквы, регион (например: А 123 АА 161)
        const autoRegex = new RegExp(`^[${validLetters}]\\d{3}[${validLetters}]{2}\\d{2,3}$`);
        isNumberValid = autoRegex.test(cleanedNumber);
    }

    if (!isNumberValid) {
        setStatus(formData.category.includes('Мотоциклы') 
            ? '❌ Неверный госномер. Формат для мотоциклов: 1234 АА 161' 
            : '❌ Неверный госномер. Введите в формате: А 123 АА 161');
        return;
    }

    setStatus('Отправка...');
    
    // Отправляем на бэкенд очищенный номер (без лишних пробелов, слитно)
    const dataToSend = { ...formData, carNumber: cleanedNumber };

    try {
      const response = await fetch('http://127.0.0.1:8000/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });
      if (response.ok) {
        setStatus('Заявка успешно отправлена! Мы скоро свяжемся с вами.');
        setFormData({ carNumber: '', phone: '', category: 'M1 Легковые автомобили', date: '', time: '' });
      } else {
        setStatus('Произошла ошибка. Пожалуйста, проверьте данные.');
      }
    } catch (error) {
      setStatus('Ошибка соединения с сервером.');
    }
  };

  const faqs = [
    { q: "Что делать, если аптечка или огнетушитель просрочены?", a: "По регламенту ЕАИСТО аптечка и огнетушитель должны иметь действующий срок годности. Вы можете приобрести новые в любом автомагазине или прямо у нас на пункте перед началом осмотра." },
    { q: "Нужно ли мыть машину перед заездом на линию?", a: "Да, автомобиль должен быть чистым. Особое внимание уделите читаемости государственных номеров и чистоте фар — камеры диагностической линии должны корректно зафиксировать транспортное средство." },
    { q: "Пройду ли я техосмотр с трещиной на лобовом стекле?", a: "Трещины в зоне очистки стеклоочистителя со стороны водителя не допускаются. Если трещина находится со стороны пассажира или вне зоны работы дворников — техосмотр пройти можно." },
    { q: "Можно ли оплатить услуги банковской картой?", a: "Да, мы принимаем оплату наличными, картами любых банков и по QR-коду (СБП). Для юридических лиц доступна оплата по счету с предоставлением полного пакета закрывающих документов." }
  ];

  return (
    <main className="min-h-screen bg-[#F9FAFB] text-gray-900 font-sans selection:bg-[#8BBA82] selection:text-white overflow-x-hidden">
      
      {/* Шапка (Адаптирована под мобильные) */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-200/50 transition-all">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4 flex justify-between items-center">
          <div className="text-xl md:text-2xl font-black tracking-tight text-[#61403A] flex items-center gap-1.5 md:gap-2">
            ТЕХПЛЮС<span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#8BBA82] inline-block mb-1"></span>
          </div>
          <nav className="hidden md:flex gap-8 text-sm font-semibold text-gray-500">
            <a href="#services" className="hover:text-[#61403A] transition-colors">Услуги</a>
            <a href="#prices" className="hover:text-[#61403A] transition-colors">Тарифы</a>
            <a href="#faq" className="hover:text-[#61403A] transition-colors">FAQ</a>
            <a href="#contacts" className="hover:text-[#61403A] transition-colors">Контакты</a>
          </nav>
          <a href="tel:+70000000000" className="text-[#61403A] font-bold text-sm md:text-base hover:text-[#8BBA82] transition-colors bg-[#61403A]/5 px-3 py-2 md:px-4 md:py-2 rounded-lg whitespace-nowrap">
            +7 (000) 000-00-00
          </a>
        </div>
      </header>

      {/* Первый экран */}
      <section className="relative pt-28 pb-16 md:pt-40 md:pb-32 px-4 md:px-6 overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-[#8BBA82]/10 blur-3xl"></div>
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-10 md:gap-16 items-center relative z-10">
          <div className="space-y-6 md:space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-1.5 rounded-full bg-white border border-gray-200 text-[#61403A] text-[10px] md:text-xs font-bold uppercase tracking-wider shadow-sm">
              <span className="relative flex h-2 w-2 md:h-2.5 md:w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8BBA82] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-full w-full bg-[#8BBA82]"></span>
              </span>
              Аккредитация РСА: № [ХХХХХ]
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1] text-gray-900">
              Официальный <br className="hidden sm:block"/><span className="text-[#61403A]">техосмотр</span> в Ростове
            </h1>
            <p className="text-base md:text-lg text-gray-600 max-w-md leading-relaxed font-medium">
              Аккредитованный пункт. Моментальная передача данных в ЕАИСТО для успешной регистрации в ГИБДД. Выполним работу за 30 минут. 
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <a href="#booking" className="bg-[#8BBA82] hover:bg-[#77a66f] text-white font-semibold py-4 px-8 rounded-xl text-center transition-all shadow-lg shadow-[#8BBA82]/30 hover:shadow-xl hover:shadow-[#8BBA82]/40 hover:-translate-y-0.5">
                Выбрать время
              </a>
            </div>
            <div className="mt-4 md:mt-6 flex flex-col gap-1 text-xs md:text-sm font-medium text-gray-600 bg-white p-4 rounded-xl border border-gray-100 shadow-sm w-full sm:w-max">
               <div className="flex items-center gap-2 text-[#61403A] font-bold mb-1">
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                 Часы работы
               </div>
               <div>Пн - Сб • <span className="text-gray-900">8.00 - 18.00</span></div>
               <div>Вс • <span className="text-gray-900">10.00 - 17.00</span></div>
            </div>
          </div>
          
          <div className="relative h-64 md:h-[500px] w-full rounded-3xl bg-white border border-gray-200 shadow-2xl shadow-gray-200/50 overflow-hidden">
             <Image 
               src="/foto_fasad.png" 
               alt="Фасад пункта техосмотра" 
               fill 
               className="object-cover"
               priority
             />
          </div>
        </div>
      </section>

      {/* Наши преимущества */}
      <section id="services" className="py-16 md:py-24 max-w-7xl mx-auto overflow-hidden">
        <div className="text-center mb-10 md:mb-16 px-6">
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#61403A]">Все для постановки на учет</h2>
          <p className="text-gray-500 mt-3 font-medium text-base md:text-lg leading-relaxed">
            Всё что нужно от вас:<br />
            1. документ, удостоверяющий личность;<br />
            2. свидетельство о регистрации транспортного средства или ПТС.
          </p>
        </div>
        
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 px-6 pb-8 md:pb-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-x-12 md:gap-y-16 hide-scrollbar">
          {[
            { 
              title: 'Сделаем за 30 минут', 
              desc: 'Ценим ваше время. Строго соблюдаем регламент, проводим осмотр/подготовку, быстро и без очередей.',
              icon: <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            },
            { 
              title: '200 метров до МРЭО', 
              desc: 'Идеальное расположение. Получите диагностическую карту и сразу отправляйтесь на постановку авто на учет.',
              icon: <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            },
            { 
              title: 'Различные категории', 
              desc: 'Оборудование сертифицировано для работы с мотоциклами (L), легковыми автомобилями (M1) и грузовиками до 3,5 т (N1).',
              icon: <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            },
            { 
              title: 'Оформление ОСАГО', 
              desc: 'Подберем оптимальный страховой тариф от надежных компаний. Оформляем прямо на месте, без навязанных допов.',
              icon: <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
            },
            { 
              title: 'Дубликаты госномеров', 
              desc: 'Печатаем номера строго по ГОСТу за 5 минут. Обновите затертые или нечитаемые знаки перед визитом в ГИБДД.',
              icon: <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
            },
            { 
              title: 'Официально в ЕАИСТО', 
              desc: 'Моментально вносим данные в единую государственную базу. Гарантируем отсутствие проблем при регистрации авто.',
              icon: <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path></svg>
            }
          ].map((item, index) => (
            <div key={index} className="snap-center shrink-0 w-[85vw] sm:w-[320px] md:w-auto bg-white md:bg-transparent p-6 md:p-0 rounded-3xl md:rounded-none border border-gray-100 md:border-none shadow-sm md:shadow-none flex flex-row md:flex-col gap-4 md:gap-5 items-start group">
              <div className="flex-shrink-0 w-12 h-12 md:w-14 md:h-14 bg-[#8BBA82]/10 rounded-xl md:rounded-2xl flex items-center justify-center text-[#8BBA82] group-hover:bg-[#8BBA82] group-hover:text-white transition-colors duration-300">
                {item.icon}
              </div>
              <div>
                <h3 className="font-bold text-lg md:text-xl text-gray-900 mb-1 md:mb-2 leading-tight">{item.title}</h3>
                <p className="text-gray-500 leading-relaxed font-medium text-sm md:text-base">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3D Галерея */}
      <section className="py-16 md:py-20 bg-white overflow-hidden border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6 mb-6 md:mb-8 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#61403A]">Современная линия</h2>
          <p className="text-gray-500 mt-2 md:mt-3 font-medium text-sm md:text-base">Оборудование, сертифицированное Росстандартом</p>
        </div>

        <div className="relative w-full max-w-7xl mx-auto h-[250px] sm:h-[350px] md:h-[500px] mt-6 md:mt-8 flex items-center justify-center">
          <button type="button" onClick={handlePrev} className="absolute left-1 md:left-[calc(50%-360px)] top-1/2 -translate-y-1/2 z-[100] text-[#61403A] drop-shadow-[0_0_15px_rgba(255,255,255,0.9)] hover:scale-125 transition-transform duration-200 cursor-pointer p-2 md:p-4 focus:outline-none">
            <svg className="w-10 h-10 md:w-16 md:h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </button>
          
          <button type="button" onClick={handleNext} className="absolute right-1 md:right-[calc(50%-360px)] top-1/2 -translate-y-1/2 z-[100] text-[#61403A] drop-shadow-[0_0_15px_rgba(255,255,255,0.9)] hover:scale-125 transition-transform duration-200 cursor-pointer p-2 md:p-4 focus:outline-none">
            <svg className="w-10 h-10 md:w-16 md:h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
          </button>

          <div className="relative w-full max-w-5xl h-full flex items-center justify-center pointer-events-none">
            {galleryPhotos.map((item, index) => {
              const isCurrent = index === currentPhotoIndex;
              const isPrev = index === (currentPhotoIndex - 1 + galleryPhotos.length) % galleryPhotos.length;
              const isNext = index === (currentPhotoIndex + 1) % galleryPhotos.length;
              let positionClasses = "opacity-0 scale-75 z-0"; 
              if (isCurrent) positionClasses = "translate-x-0 scale-100 z-30 opacity-100 blur-none shadow-2xl shadow-gray-300/60 pointer-events-auto cursor-default";
              else if (isPrev) positionClasses = "-translate-x-[40%] md:-translate-x-[60%] scale-[0.85] z-20 opacity-60 blur-[4px] md:blur-[5px] cursor-pointer hover:opacity-100 pointer-events-auto";
              else if (isNext) positionClasses = "translate-x-[40%] md:translate-x-[60%] scale-[0.85] z-20 opacity-60 blur-[4px] md:blur-[5px] cursor-pointer hover:opacity-100 pointer-events-auto";

              return (
                <div key={item} onClick={() => { if (isPrev) handlePrev(); if (isNext) handleNext(); }}
                  className={`absolute w-[75%] sm:w-[65%] md:w-[600px] h-[90%] bg-gray-100 rounded-3xl border border-gray-200 flex items-center justify-center text-gray-400 transition-all duration-700 ease-out ${positionClasses}`}>
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-200 rounded-3xl"></div>
                  <span className="relative z-10 text-xl md:text-2xl font-bold text-gray-500">Фото {item}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>


      {/* Тарифы и Форма */}
      <section className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-24 grid lg:grid-cols-2 gap-12 md:gap-16 lg:gap-24 items-start">
          
          <div className="space-y-10 md:space-y-12">
            <div>
              <h2 id="prices" className="text-3xl md:text-4xl font-extrabold mb-6 md:mb-8 text-[#61403A]">Прозрачные тарифы</h2>
              <div className="space-y-3 md:space-y-4">
                {[
                  { cat: 'L', name: 'Мотоциклы', price: 'от 423 ₽' },
                  { cat: 'M1', name: 'Легковые автомобили', price: 'от 1203 ₽' },
                  { cat: 'N1', name: 'Грузовики массой не более 3,5 т', price: 'от 1315 ₽' }
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center p-5 md:p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:border-gray-200 transition-colors">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-[10px] md:text-xs font-bold rounded uppercase tracking-wider">{item.cat}</span>
                      </div>
                      <span className="font-semibold text-sm md:text-base text-gray-900">{item.name}</span>
                    </div>
                    <div className="text-xl md:text-2xl font-black text-[#8BBA82]">{item.price}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Форма бронирования (Адаптированные отступы) */}
          <div id="booking" className="bg-[#61403A] p-6 md:p-12 rounded-3xl text-white shadow-2xl relative overflow-hidden">
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
                    className="w-full p-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#8BBA82] focus:ring-1 focus:ring-[#8BBA82] uppercase text-sm md:text-base" placeholder="А 123 АА 161" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                  <div>
                    <label className="block text-[10px] md:text-xs font-bold uppercase tracking-wider text-white/60 mb-2 pl-1">Телефон</label>
                    <input required type="tel" name="phone" value={formData.phone} onChange={handleChange}
                      className="w-full p-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-[#8BBA82] focus:ring-1 focus:ring-[#8BBA82] text-sm md:text-base" placeholder="+7 (___) ___-__-__" />
                  </div>
                  <div>
                    <label className="block text-[10px] md:text-xs font-bold uppercase tracking-wider text-white/60 mb-2 pl-1">Категория</label>
                    <select name="category" value={formData.category} onChange={handleChange}
                      className="w-full p-4 bg-[#61403A] border border-white/20 rounded-xl text-white focus:outline-none focus:border-[#8BBA82] text-sm md:text-base">
                      <option value="M1 Легковые автомобили">M1 Легковые авто</option>
                      <option value="L Мотоциклы">L Мотоциклы</option>
                      <option value="N1 Грузовики (до 3,5т)">N1 Грузовики (до 3,5 т)</option>
                    </select>
                  </div>
                </div>

                <div>
                   <label className="block text-[10px] md:text-xs font-bold uppercase tracking-wider text-white/60 mb-2 pl-1">Выберите день</label>
                   <input required type="date" name="date" value={formData.date} onChange={handleChange}
                     className="w-full p-4 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:border-[#8BBA82] [color-scheme:dark] text-sm md:text-base" />
                </div>

                {/* ОБНОВЛЕННАЯ СЕТКА ВРЕМЕНИ ДЛЯ ТЕЛЕФОНОВ */}
                {formData.date && (
                  <div className="animate-fade-in-up">
                     <label className="block text-[10px] md:text-xs font-bold uppercase tracking-wider text-white/60 mb-3 pl-1">Доступные слоты</label>
                     {/* 3 колонки на смартфонах, 4-5 на больших экранах */}
                     <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 md:gap-3 max-h-56 md:max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                        {getAvailableTimeSlots().map(slot => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, time: slot }))}
                            className={`py-3 md:py-2 px-1 md:px-2 text-sm md:text-base font-bold rounded-xl border transition-all whitespace-nowrap ${
                              formData.time === slot 
                                ? 'bg-[#8BBA82] border-[#8BBA82] text-white shadow-md' 
                                : 'bg-transparent border-white/20 text-white hover:border-[#8BBA82] hover:bg-white/5'
                            }`}
                          >
                            {slot}
                          </button>
                        ))}
                     </div>
                  </div>
                )}
                
                <button type="submit" disabled={!formData.time} className={`w-full font-bold py-4 rounded-xl mt-2 transition-colors shadow-lg text-sm md:text-base ${formData.time ? 'bg-[#8BBA82] hover:bg-[#77a66f] text-white shadow-[#8BBA82]/20' : 'bg-gray-500/50 text-gray-300 cursor-not-allowed shadow-none'}`}>
                  {formData.time ? 'Забронировать визит' : 'Выберите дату и время'}
                </button>
                
                {status && (
                  <div className={`p-4 rounded-xl border mt-4 ${status.includes('успешно') ? 'bg-[#8BBA82]/10 border-[#8BBA82]/30 text-[#8BBA82]' : 'bg-red-500/10 border-red-500/30 text-red-200'} text-center text-sm font-medium`}>{status}</div>
                )}
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16 md:py-24 px-4 md:px-6 bg-[#F9FAFB]">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-10 md:mb-12 text-center text-[#61403A]">Частые вопросы</h2>
          <div className="space-y-3 md:space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                <button onClick={() => setOpenFaq(openFaq === index ? null : index)} className="w-full px-5 md:px-6 py-4 md:py-5 text-left flex justify-between items-center focus:outline-none">
                  <span className="font-bold text-gray-900 pr-4 text-sm md:text-base">{faq.q}</span>
                  <svg className={`w-5 h-5 text-[#8BBA82] flex-shrink-0 transition-transform duration-300 ${openFaq === index ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className={`px-5 md:px-6 overflow-hidden transition-all duration-300 ${openFaq === index ? 'max-h-56 pb-4 md:pb-5 opacity-100' : 'max-h-0 opacity-0'}`}>
                  <p className="text-gray-500 leading-relaxed text-sm md:text-base">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Контакты и Карта (Адаптированная высота карты) */}
      {/* Контакты и Идеальная Карта */}
      <section id="contacts" className="py-16 md:py-24 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 md:px-6 grid lg:grid-cols-3 gap-8 md:gap-12">
          
          {/* Левая колонка: Контакты + Кнопка Маршрута */}
          <div className="lg:col-span-1 flex flex-col justify-between space-y-8 bg-[#F9FAFB] p-6 md:p-10 rounded-3xl border border-gray-100">
            <div>
              <h2 className="text-3xl font-extrabold text-[#61403A] mb-8">Ждем вас</h2>
              <div className="space-y-6 text-gray-600">
                <div>
                  <div className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Адрес СТО</div>
                  <div className="font-semibold text-gray-900 leading-tight text-sm md:text-base">344090, Ростовская обл.,<br/>г. Ростов-на-Дону,<br/>ул. Доватора, д. 271, стр. 1</div>
                </div>
                <div>
                  <div className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Часы работы</div>
                  <div className="font-semibold text-gray-900 text-sm md:text-base">Пн - Сб • 8:00 - 18:00<br/>Вс • 10:00 - 17:00</div>
                </div>
                <div>
                  <div className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Связь</div>
                  <a href="tel:+70000000000" className="font-black text-xl md:text-2xl text-[#8BBA82] block hover:text-[#61403A] transition-colors mb-1">+7 (000) 000-00-00</a>
                  <a href="mailto:tekhplus@yandex.ru" className="font-medium text-gray-500 hover:text-[#8BBA82] transition-colors text-sm md:text-base">tekhplus@yandex.ru</a>
                </div>
              </div>
            </div>

            {/* Акцентная кнопка автоматического маршрута */}
            <div className="pt-6 mt-6 border-t border-gray-200">
              <a 
                href="https://yandex.ru/maps/?rtext=~Ростов-на-Дону,+улица+Доватора,+271с1&rtt=auto" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center justify-center gap-3 bg-[#8BBA82] hover:bg-[#77a66f] text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg shadow-[#8BBA82]/30 hover:shadow-xl hover:shadow-[#8BBA82]/40 hover:-translate-y-0.5 w-full text-sm md:text-base group"
              >
                <svg className="w-6 h-6 group-hover:animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Построить маршрут
              </a>
              <p className="text-center text-xs text-gray-400 mt-3 font-medium">Откроется в Яндекс Навигаторе</p>
            </div>
          </div>
          
          {/* Правая колонка: Карта без рамок */}
          {/* Правая колонка: Карта без рамок (из Конструктора Яндекса) */}
          <div className="lg:col-span-2 h-[350px] md:h-auto min-h-[400px] bg-gray-100 rounded-3xl overflow-hidden relative isolate transform-gpu shadow-sm border border-gray-200">
             <iframe 
               src="https://yandex.ru/map-widget/v1/?um=constructor%3A009b3fe9901a3701834297769ac0653821d629ea2a870450b2fdf9bd86a0c8be&;source=constructor" 
               className="absolute inset-0 w-full h-full z-10 border-0"
               allowFullScreen={true}
             ></iframe>
          </div>
          
        </div>
      </section>
      
      {/* Футер */}
      <footer className="bg-gray-900 text-gray-400 py-10 md:py-12 text-xs md:text-sm">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-8">
          <div className="space-y-2 text-center md:text-left w-full md:w-auto">
             <p className="text-gray-300 font-bold">ООО "ТЕХПЛЮС" • ИНН 6168125681 • ОГРН 1256100025697</p>
             <p>Адрес: 344090, Ростовская обл., г. Ростов-на-Дону, ул. Доватора, д. 271, стр. 1</p>
          </div>
          <div className="text-center md:text-right space-y-2 w-full md:w-auto border-t border-gray-800 pt-6 md:border-none md:pt-0">
             <p>© Copyright 2026 • <a href="http://техосмотр-на-доватора.рф" className="hover:text-white transition-colors underline decoration-gray-700 underline-offset-4">http://техосмотр-на-доватора.рф</a></p>
             <p><a href="#" className="hover:text-white transition-colors underline decoration-gray-700 underline-offset-4">Политика конфиденциальности</a></p>
          </div>
        </div>
      </footer>

      {/* Глобальные стили */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }
        .animate-fade-in-up { animation: fadeInUp 0.4s ease-out forwards; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}} />
    </main>
  );
}