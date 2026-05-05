import { useState, useEffect } from 'react';

const defaultForm = {
  title: '', description: '',
  start_date: '', start_time: '',
  end_date: '', end_time: '',
  hours: '', required_volunteers: '',
  image_url: '', recurrence_pattern: ''
};

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function useEventForm(initialData = null) {
  const [formData, setFormData] = useState(initialData || defaultForm);

  // Auto-calculate hours from time difference
  useEffect(() => {
    if (formData.start_time && formData.end_time) {
      const start = new Date(`1970-01-01T${formData.start_time}`);
      const end = new Date(`1970-01-01T${formData.end_time}`);
      let diff = (end - start) / (1000 * 60 * 60);
      if (diff < 0) diff += 24;
      setFormData(prev => ({ ...prev, hours: diff.toFixed(1) }));
    }
  }, [formData.start_time, formData.end_time]);

  const handleInputChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const toggleRecurringDay = (day) => {
    let days = formData.recurrence_pattern ? formData.recurrence_pattern.split(', ') : [];
    days = days.includes(day) ? days.filter(d => d !== day) : [...days, day];
    days.sort((a, b) => DAYS_OF_WEEK.indexOf(a) - DAYS_OF_WEEK.indexOf(b));
    setFormData(prev => ({ ...prev, recurrence_pattern: days.join(', ') }));
  };

  const resetForm = (data = null) => setFormData(data || defaultForm);

  const isMultiDay = formData.start_date && formData.end_date &&
    formData.start_date !== formData.end_date;

  return { formData, handleInputChange, toggleRecurringDay, resetForm, isMultiDay };
}

