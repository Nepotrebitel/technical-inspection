import Link from "next/link";
import { Manrope } from "next/font/google";

const manrope = Manrope({ subsets: ["cyrillic", "latin"], weight: ["400", "500", "600", "700", "800"] });

export default function PrivacyPage() {
  return (
    <main className={`min-h-screen bg-[#F8F9F7] text-[#151C2B] py-12 px-4 sm:px-6 md:px-12 ${manrope.className}`}>
      <div className="max-w-3xl mx-auto bg-white rounded-[28px] p-6 sm:p-10 md:p-12 shadow-sm border border-[#E8EBE8] space-y-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-extrabold text-[#5B8E52] hover:text-[#61403A]">
          ← Вернуться на главную
        </Link>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#61403A]">
          Политика в отношении обработки персональных данных
        </h1>

        <div className="space-y-4 text-sm sm:text-[15px] text-[#657080] leading-relaxed">
          <p>
            <strong className="text-[#151C2B]">1. Общие положения.</strong> Настоящая Политика разработана в соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных» и определяет порядок обработки персональных данных ООО «ТЕХПЛЮС» (ИНН 6168125681, ОГРН 1256100025697, адрес: 344090, Ростовская обл., г. Ростов-на-Дону, ул. Доватора, зд. 271, стр. 1).
          </p>
          <p>
            <strong className="text-[#151C2B]">2. Состав и цели обработки.</strong> Оператор обрабатывает номер телефона и государственный регистрационный знак транспортного средства исключительно в целях предварительной записи на прохождение технического осмотра, подтверждения визита и обратной связи с клиентом.
          </p>
          <p>
            <strong className="text-[#151C2B]">3. Локализация баз данных (ч. 5 ст. 18 152-ФЗ).</strong> Запись, систематизация, накопление и хранение персональных данных граждан Российской Федерации осуществляются с использованием баз данных, находящихся на территории Российской Федерации.
          </p>
          <p>
            <strong className="text-[#151C2B]">4. Файлы Cookie и метрические сервисы.</strong> На сайте могут использоваться технические файлы cookie для корректного отображения интерактивных карт (Яндекс.Карты). Пользователь может ограничить или отключить использование cookie в настройках своего браузера.
          </p>
          <p>
            <strong className="text-[#151C2B]">5. Права субъекта ПДн и отзыв согласия.</strong> Вы вправе запросить уточнение или удаление ваших персональных данных, направив обращение на электронную почту <a href="mailto:tekhplus@yandex.ru" className="text-[#5B8E52] font-bold underline">tekhplus@yandex.ru</a> или позвонив по телефону +7 (988) 255-65-47.
          </p>
        </div>
      </div>
    </main>
  );
}