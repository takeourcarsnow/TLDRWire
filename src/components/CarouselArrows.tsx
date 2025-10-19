import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CarouselArrowsProps {
  onScrollLeft: () => void;
  onScrollRight: () => void;
}

const CarouselArrows: React.FC<CarouselArrowsProps> = ({ onScrollLeft, onScrollRight }) => {
  return (
    <>
      <div className="arrow-button" onClick={onScrollLeft} aria-label="Scroll left">
        <ChevronLeft size={16} />
      </div>
      <div className="arrow-button" onClick={onScrollRight} aria-label="Scroll right">
        <ChevronRight size={16} />
      </div>
    </>
  );
};

export default CarouselArrows;