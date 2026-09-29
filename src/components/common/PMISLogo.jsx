import React from 'react';
import { motion } from 'framer-motion';
import cambridgeLogo from '../../assets/images/Cambridge-Learning-Services.png';

const PMISLogo = ({ variant = 'default', className = '', size = null }) => {
  // Sizing definitions tailored for the 3:1 banner Cambridge Learning Services logo
  const configs = {
    login: {
      wrapper: "flex flex-col items-center justify-center mb-3",
      img: "h-14 sm:h-16 md:h-20 w-auto max-w-[280px] sm:max-w-[340px] drop-shadow-sm"
    },
    navbar: {
      wrapper: "flex items-center",
      img: "h-9 sm:h-10 md:h-11 w-auto max-w-[210px] sm:max-w-[260px]"
    },
    admission: {
      wrapper: "flex items-center justify-center",
      img: "h-12 sm:h-14 md:h-16 w-auto max-w-[280px]"
    },
    compact: {
      wrapper: "flex items-center",
      img: "h-8 sm:h-9 w-auto max-w-[180px]"
    },
    default: {
      wrapper: "flex items-center justify-center",
      img: "h-12 sm:h-14 w-auto max-w-[240px]"
    }
  };

  const config = configs[variant] || configs.default;

  // Custom inline sizing support when callers pass numeric size (e.g., size={70})
  const customImgStyle = size ? { height: `${size * 0.7}px`, width: 'auto' } : {};

  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.6, 
        ease: [0.22, 1, 0.36, 1],
        delay: 0.15 
      }}
      className={`${config.wrapper} ${className}`}
    >
      <img
        src={cambridgeLogo}
        alt="Cambridge Learning Services"
        style={customImgStyle}
        className={`${!size ? config.img : 'w-auto max-w-[320px]'} object-contain select-none pointer-events-none transition-transform duration-300`}
        draggable={false}
      />
    </motion.div>
  );
};

export const CambridgeLogo = PMISLogo;
export const CambridgeSLogo = PMISLogo;
export default PMISLogo;
