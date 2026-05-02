import React, { useState, useEffect } from 'react';
import { Calendar, Clock, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

interface EventCardProps {
  event: any;
  onAction?: () => void;
  actionLabel?: string;
  isRegistered?: boolean;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onAction, actionLabel, isRegistered }) => {
  const [timeLeft, setTimeLeft] = useState<{ d: number, h: number, m: number, s: number } | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const eventDate = new Date(`${event.date}T${event.time}`);
      const now = new Date();
      const difference = eventDate.getTime() - now.getTime();

      if (difference > 0) {
        setTimeLeft({
          d: Math.floor(difference / (1000 * 60 * 60 * 24)),
          h: Math.floor((difference / (1000 * 60 * 60)) % 24),
          m: Math.floor((difference / 1000 / 60) % 60),
          s: Math.floor((difference / 1000) % 60)
        });
      } else {
        setTimeLeft(null);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [event.date, event.time]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="glass-card rounded-xl overflow-hidden group"
    >
      {/* Hero area with countdown */}
      <div className="relative h-40 bg-zinc-900/80 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent" />
        <div className="absolute top-4 right-4 z-10">
          <span className="px-2.5 py-0.5 rounded-md bg-black/40 backdrop-blur-sm border border-white/10 text-blue-400 text-xs font-medium">
            {event.society_name}
          </span>
        </div>

        <div className="relative z-10 flex items-center gap-4 text-white">
          {timeLeft ? (
            <>
              {[
                { label: 'Days', val: timeLeft.d },
                { label: 'Hrs', val: timeLeft.h },
                { label: 'Min', val: timeLeft.m },
                { label: 'Sec', val: timeLeft.s }
              ].map(unit => (
                <div key={unit.label} className="text-center">
                  <div className="text-2xl font-bold font-display tracking-tight group-hover:text-blue-400 transition-colors">
                    {String(unit.val).padStart(2, '0')}
                  </div>
                  <div className="text-[10px] font-medium text-zinc-500">{unit.label}</div>
                </div>
              ))}
            </>
          ) : (
            <div className="text-sm text-zinc-600 font-medium">Event has started</div>
          )}
        </div>
      </div>

      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-base font-semibold text-white group-hover:text-blue-400 transition-colors leading-snug">
            {event.title}
          </h3>
          {isRegistered && (
            <span className="shrink-0 ml-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-md text-xs font-medium">
              Registered
            </span>
          )}
        </div>

        <p className="text-sm text-zinc-400 mb-4 line-clamp-2 leading-relaxed">
          {event.description}
        </p>

        <div className="grid grid-cols-2 gap-4 mb-4 border-y border-white/[0.06] py-3">
          <div>
            <div className="text-xs font-medium text-zinc-500 mb-0.5">Date</div>
            <div className="flex items-center gap-1.5 text-sm text-white font-medium">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              <span>{event.date}</span>
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-zinc-500 mb-0.5">Time</div>
            <div className="flex items-center gap-1.5 text-sm text-white font-medium">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>{event.time}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-white">
            {event.participant_count} <span className="text-zinc-500">/ {event.capacity}</span>
          </span>

          {onAction && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAction();
              }}
              disabled={isRegistered || (event.participant_count >= event.capacity)}
              className={
                isRegistered
                  ? 'px-4 py-1.5 rounded-lg text-sm font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 cursor-default'
                  : event.participant_count >= event.capacity
                  ? 'px-4 py-1.5 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  : 'btn-primary flex items-center gap-1.5 !py-1.5 !px-4'
              }
            >
              {isRegistered ? 'Registered' : event.participant_count >= event.capacity ? 'Full' : actionLabel || 'Register'}
              {!isRegistered && !(event.participant_count >= event.capacity) && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};
