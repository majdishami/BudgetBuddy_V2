import React, { useState } from 'react';
import DatePicker from 'react-datepicker'; // Use a standard calendar library
import 'react-datepicker/dist/react-datepicker.css'; // Import styles
import { Button } from '../ui/button';

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface DateRangePickerProps {
  onRangeSelect: (range: DateRange) => void;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({ onRangeSelect }) => {
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const handleApply = () => {
    onRangeSelect({ from: startDate, to: endDate });
  };

  return (
    <div className="p-4">
      <div className="flex flex-col space-y-4">
        {/* Standard Calendar for Date Range Selection */}
        <DatePicker
          selectsRange // Enable range selection
          startDate={startDate}
          endDate={endDate}
          onChange={(dates) => {
            const [start, end] = dates;
            setStartDate(start ?? undefined);
            setEndDate(end ?? undefined);
          }}
          inline // Display calendar inline
          isClearable // Allow clearing the selection
          placeholderText="Select a date range"
        />
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => {
              setStartDate(undefined);
              setEndDate(undefined);
            }}
          >
            Clear Selection
          </Button>
          <Button onClick={handleApply}>Apply Range</Button>
        </div>
      </div>
    </div>
  );
};

export default DateRangePicker;