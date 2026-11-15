"use client";

import * as React from "react";

// Простая встроенная утилита объединения классов (заменяет cn)
function cx(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

/** 
 * 1. Глобальный SVG-фильтр жидкого стекла. 
 * Размещается ОДИН раз в начале <main>.
 */
export function LiquidGlassFilter() {
  return (
    <svg className="hidden" aria-hidden="true">
      <defs>
        <filter
          id="container-glass"
          x="0%"
          y="0%"
          width="100%"
          height="100%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.045 0.045"
            numOctaves="1"
            seed="1"
            result="turbulence"
          />
          <feGaussianBlur in="turbulence" stdDeviation="2" result="blurredNoise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="blurredNoise"
            scale="55"
            xChannelSelector="R"
            yChannelSelector="B"
            result="displaced"
          />
          <feGaussianBlur in="displaced" stdDeviation="3" result="finalBlur" />
          <feComposite in="finalBlur" in2="finalBlur" operator="over" />
        </filter>
      </defs>
    </svg>
  );
}

/**
 * 2. Слой «Жидкого стекла» для любых карточек и плашек (<div>).
 * Вставляется внутрь блока с классами `relative overflow-hidden`.
 */
export function LiquidGlassLayer({ roundedClass = "rounded-[24px]" }: { roundedClass?: string }) {
  return (
    <>
      <div
        className={cx(
          "pointer-events-none absolute inset-0 z-0 transition-all",
          roundedClass,
          "shadow-[0_4px_16px_rgba(0,0,0,0.06),inset_3px_3px_1px_-2px_rgba(255,255,255,0.9),inset_-3px_-3px_1px_-2px_rgba(255,255,255,0.75),inset_1px_1px_1px_-0.5px_rgba(255,255,255,0.6),inset_0_0_12px_2px_rgba(255,255,255,0.3)]"
        )}
      />
      <div
        className={cx(
          "pointer-events-none absolute inset-0 isolate -z-10 overflow-hidden",
          roundedClass
        )}
        style={{
          backdropFilter: 'url("#container-glass") blur(8px)',
          WebkitBackdropFilter: 'url("#container-glass") blur(8px)',
        }}
      />
    </>
  );
}

/**
 * 3. Кнопка «Жидкое стекло» (LiquidButton).
 * Если передать `href`, автоматически рендерится как ссылка <a> (удобно для якорных переходов).
 */
export interface LiquidButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  href?: string;
  size?: "sm" | "default" | "lg" | "xl" | "xxl";
  roundedClass?: string;
}

export function LiquidButton({
  className,
  size = "xxl",
  roundedClass = "rounded-full",
  href,
  children,
  ...props
}: LiquidButtonProps) {
  const sizeClasses = {
    sm: "h-9 px-4 text-xs",
    default: "h-11 px-6 text-sm",
    lg: "h-12 px-7 text-base",
    xl: "h-14 px-8 text-[17px]",
    xxl: "py-4 px-8 md:py-5 md:px-9 text-[17px]",
  }[size];

  const baseClasses = cx(
    "relative inline-flex items-center justify-center gap-3 font-bold cursor-pointer select-none transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
    roundedClass,
    sizeClasses,
    className
  );

  const innerContent = (
    <>
      {/* Объемные стеклянные блики и внутренние тени */}
      <div
        className={cx(
          "pointer-events-none absolute inset-0 z-0 transition-all",
          roundedClass,
          "shadow-[0_8px_24px_rgba(0,0,0,0.08),inset_3px_3px_1px_-2px_rgba(255,255,255,0.95),inset_-3px_-3px_1px_-2px_rgba(255,255,255,0.8),inset_1px_1px_2px_rgba(255,255,255,0.7),inset_0_0_10px_2px_rgba(255,255,255,0.35)]"
        )}
      />
      {/* Слой преломления фона */}
      <div
        className={cx(
          "pointer-events-none absolute inset-0 isolate -z-10 overflow-hidden",
          roundedClass
        )}
        style={{
          backdropFilter: 'url("#container-glass") blur(8px)',
          WebkitBackdropFilter: 'url("#container-glass") blur(8px)',
        }}
      />
      {/* Контент кнопки */}
      <span className="relative z-10 inline-flex items-center gap-3">
        {children}
      </span>
    </>
  );

  if (href) {
    return (
      <a href={href} className={baseClasses}>
        {innerContent}
      </a>
    );
  }

  return (
    <button className={baseClasses} {...props}>
      {innerContent}
    </button>
  );
}

/**
 * 4. Металлическая кнопка (MetalButton) из исходного шаблона
 */
type ColorVariant = "default" | "primary" | "success" | "error" | "gold" | "bronze";

interface MetalButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ColorVariant;
}

const colorVariants: Record<
  ColorVariant,
  { outer: string; inner: string; button: string; textColor: string; textShadow: string }
> = {
  default: {
    outer: "bg-gradient-to-b from-[#000] to-[#A0A0A0]",
    inner: "bg-gradient-to-b from-[#FAFAFA] via-[#3E3E3E] to-[#E5E5E5]",
    button: "bg-gradient-to-b from-[#B9B9B9] to-[#969696]",
    textColor: "text-white",
    textShadow: "[text-shadow:_0_-1px_0_rgb(80_80_80_/_100%)]",
  },
  primary: {
    outer: "bg-gradient-to-b from-[#61403A] to-[#A0A0A0]",
    inner: "bg-gradient-to-b from-[#9DC895] via-[#61403A] to-[#8BBA82]",
    button: "bg-gradient-to-b from-[#8BBA82] to-[#77a66f]",
    textColor: "text-white",
    textShadow: "[text-shadow:_0_-1px_0_rgb(40_60_40_/_100%)]",
  },
  success: {
    outer: "bg-gradient-to-b from-[#005A43] to-[#7CCB9B]",
    inner: "bg-gradient-to-b from-[#E5F8F0] via-[#00352F] to-[#D1F0E6]",
    button: "bg-gradient-to-b from-[#9ADBC8] to-[#3E8F7C]",
    textColor: "text-[#FFF7F0]",
    textShadow: "[text-shadow:_0_-1px_0_rgb(6_78_59_/_100%)]",
  },
  error: {
    outer: "bg-gradient-to-b from-[#5A0000] to-[#FFAEB0]",
    inner: "bg-gradient-to-b from-[#FFDEDE] via-[#680002] to-[#FFE9E9]",
    button: "bg-gradient-to-b from-[#F08D8F] to-[#A45253]",
    textColor: "text-[#FFF7F0]",
    textShadow: "[text-shadow:_0_-1px_0_rgb(146_64_14_/_100%)]",
  },
  gold: {
    outer: "bg-gradient-to-b from-[#917100] to-[#EAD98F]",
    inner: "bg-gradient-to-b from-[#FFFDDD] via-[#856807] to-[#FFF1B3]",
    button: "bg-gradient-to-b from-[#FFEBA1] to-[#9B873F]",
    textColor: "text-[#FFFDE5]",
    textShadow: "[text-shadow:_0_-1px_0_rgb(178_140_2_/_100%)]",
  },
  bronze: {
    outer: "bg-gradient-to-b from-[#864813] to-[#E9B486]",
    inner: "bg-gradient-to-b from-[#EDC5A1] via-[#5F2D01] to-[#FFDEC1]",
    button: "bg-gradient-to-b from-[#FFE3C9] to-[#A36F3D]",
    textColor: "text-[#FFF7F0]",
    textShadow: "[text-shadow:_0_-1px_0_rgb(124_45_18_/_100%)]",
  },
};

export const MetalButton = React.forwardRef<HTMLButtonElement, MetalButtonProps>(
  ({ children, className, variant = "default", ...props }, ref) => {
    const [isPressed, setIsPressed] = React.useState(false);
    const [isHovered, setIsHovered] = React.useState(false);
    const colors = colorVariants[variant];

    return (
      <div
        className={cx("relative inline-flex transform-gpu rounded-full p-[1.5px]", colors.outer)}
        style={{
          transform: isPressed ? "translateY(2px) scale(0.99)" : "translateY(0) scale(1)",
          transition: "all 250ms cubic-bezier(0.1, 0.4, 0.2, 1)",
        }}
      >
        <div className={cx("absolute inset-[1px] rounded-full", colors.inner)} />
        <button
          ref={ref}
          className={cx(
            "relative z-10 m-[1px] inline-flex items-center justify-center overflow-hidden rounded-full px-7 py-3.5 text-base font-bold outline-none cursor-pointer",
            colors.button,
            colors.textColor,
            colors.textShadow,
            className
          )}
          style={{
            transform: isPressed ? "scale(0.97)" : "scale(1)",
            filter: isHovered && !isPressed ? "brightness(1.06)" : "none",
            transition: "all 250ms cubic-bezier(0.1, 0.4, 0.2, 1)",
          }}
          onMouseDown={() => setIsPressed(true)}
          onMouseUp={() => setIsPressed(false)}
          onMouseLeave={() => { setIsPressed(false); setIsHovered(false); }}
          onMouseEnter={() => setIsHovered(true)}
          {...props}
        >
          {children}
        </button>
      </div>
    );
  }
);
MetalButton.displayName = "MetalButton";