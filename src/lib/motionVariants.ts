export const curaEase = [0.2, 0, 0, 1] as const;

export const containerVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: curaEase,
      staggerChildren: 0.06,
    },
  },
};

export const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: curaEase },
  },
};

export const slideInVariants = {
  initial: { opacity: 0, x: 20 },
  animate: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: curaEase },
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: { duration: 0.3, ease: curaEase },
  },
};
