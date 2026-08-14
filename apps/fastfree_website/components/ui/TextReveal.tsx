'use client';

import { motion } from 'framer-motion';

interface TextRevealProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
}

export function TextReveal({ text, className = '', style }: TextRevealProps) {
  const words = text.split(' ');

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.1 },
    },
  };

  const childVariants = {
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        damping: 22,
        stiffness: 90,
      },
    },
    hidden: {
      opacity: 0,
      y: '100%',
    },
  };

  return (
    <motion.span
      className={`inline-flex flex-wrap justify-start ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      style={style}
    >
      {words.map((word, idx) => (
        <span key={idx} className="overflow-hidden inline-block mx-[0.12em] py-0.5">
          <motion.span variants={childVariants} className="inline-block">
            {word}
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
}

