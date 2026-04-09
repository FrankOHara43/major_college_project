const { motion } = Motion;

window.Hero = function Hero() {
  const floatingTags = [
    { label: "Real-time", className: "-left-2 top-8 md:-left-12" },
    { label: "AI Powered", className: "right-0 top-2 md:-right-10" },
    { label: "Fast", className: "left-4 -bottom-4 md:-left-6" },
    { label: "Multilingual", className: "right-4 -bottom-3 md:right-0" },
  ];

  return (
    <section className="relative mx-auto mt-12 w-full max-w-4xl px-4 text-center sm:px-6">
      <div className="relative rounded-[2rem] border border-white/35 bg-white/25 px-6 py-14 shadow-[0_20px_100px_-40px_rgba(91,33,182,0.65)] backdrop-blur-2xl sm:px-10">
        {floatingTags.map((tag, index) => (
          <motion.span
            key={tag.label}
            animate={{ y: [0, -7, 0], rotate: [0, index % 2 === 0 ? -1.5 : 1.5, 0] }}
            transition={{
              duration: 4.2 + index,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className={`absolute hidden rounded-full border border-white/30 bg-white/60 px-3 py-1 text-xs font-semibold text-slate-700 shadow-md backdrop-blur-md md:inline-flex ${tag.className}`}
          >
            {tag.label}
          </motion.span>
        ))}

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
          className="mx-auto max-w-3xl text-4xl font-black leading-tight tracking-tight text-slate-900 sm:text-5xl md:text-6xl"
        >
          Turn your voice into text instantly
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.25, ease: "easeOut" }}
          className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-700 sm:text-lg"
        >
          Speak naturally and watch your words appear in real-time with AI-powered transcription
        </motion.p>
      </div>
    </section>
  );
};
