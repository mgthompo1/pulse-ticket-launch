import { useEffect, useState } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';

interface ReservationTimerProps {
  timeRemaining: number; // in seconds
  onExtend?: () => void;
  showExtendButton?: boolean;
}

export const ReservationTimer = ({
  timeRemaining,
  onExtend,
  showExtendButton = false
}: ReservationTimerProps) => {
  const [isLowTime, setIsLowTime] = useState(false);

  useEffect(() => {
    // Show warning when less than 2 minutes (120 seconds) remaining
    setIsLowTime(timeRemaining > 0 && timeRemaining <= 120);
  }, [timeRemaining]);

  if (timeRemaining <= 0) {
    return null;
  }

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  const formatTime = () => {
    const mins = String(minutes).padStart(2, '0');
    const secs = String(seconds).padStart(2, '0');
    return `${mins}:${secs}`;
  };

  // Determine color based on time remaining
  const getTimerColor = () => {
    if (timeRemaining <= 60) return 'text-red-600'; // < 1 minute
    if (timeRemaining <= 120) return 'text-orange-600'; // < 2 minutes
    return 'text-gray-700';
  };

  const getBgColor = () => {
    if (timeRemaining <= 60) return 'bg-red-50 border-red-200';
    if (timeRemaining <= 120) return 'bg-orange-50 border-orange-200';
    return 'bg-blue-50 border-blue-200';
  };

  return (
    <div className="space-y-2">
      {/* Timer Display */}
      <div className={`flex items-center justify-between p-3 rounded-lg border ${getBgColor()}`}>
        <div className="flex items-center gap-2">
          {isLowTime ? (
            <AlertTriangle className={`h-5 w-5 ${getTimerColor()}`} />
          ) : (
            <Clock className={`h-5 w-5 ${getTimerColor()}`} />
          )}
          <div>
            <p className="text-sm font-medium text-gray-700">
              {isLowTime ? 'Hurry! Time running out' : 'Reservation expires in'}
            </p>
            <p className={`text-2xl font-bold ${getTimerColor()}`}>
              {formatTime()}
            </p>
          </div>
        </div>

        {showExtendButton && onExtend && timeRemaining <= 300 && ( // Show extend button when < 5 minutes
          <button
            onClick={onExtend}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            +10 min
          </button>
        )}
      </div>

      {/* Warning Alert when < 2 minutes */}
      {isLowTime && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {timeRemaining <= 60
              ? 'Less than 1 minute remaining! Complete your purchase now to secure your tickets.'
              : 'Less than 2 minutes remaining. Please complete your purchase soon.'
            }
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
