
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { db, firestore } from '../services';
import type { Event } from '../types';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, CalendarIcon, LockClosedIcon, TrashIcon, ChevronDownIcon, PaletteIcon, XIcon, CheckIcon } from './Icons';

type Theme = string;
type View = 'day' | 'week' | 'month' | 'year';

interface CalendarPageProps {
    user: User;
    theme: Theme;
    onThemeChange: (theme: Theme) => void;
}

interface FilterState {
    types: Set<string>;
    visibility: Set<'public' | 'private'>;
}

interface EventTypeConfig {
    base: string;
    text: string;
    border: string;
    dot: string;
    name: string;
    id: string; // Color ID for reference
}

interface ColorOption {
    id: string;
    label: string;
    base: string;
    text: string;
    border: string;
    dot: string;
    ring: string;
}

const COLOR_PALETTE: ColorOption[] = [
    { id: 'slate', label: 'Slate', base: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-200', dot: 'bg-slate-500', ring: 'ring-slate-400' },
    { id: 'red', label: 'Red', base: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', dot: 'bg-red-500', ring: 'ring-red-400' },
    { id: 'orange', label: 'Orange', base: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200', dot: 'bg-orange-500', ring: 'ring-orange-400' },
    { id: 'amber', label: 'Amber', base: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200', dot: 'bg-amber-500', ring: 'ring-amber-400' },
    { id: 'green', label: 'Green', base: 'bg-green-100', text: 'text-green-800', border: 'border-green-200', dot: 'bg-green-500', ring: 'ring-green-400' },
    { id: 'emerald', label: 'Emerald', base: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200', dot: 'bg-emerald-500', ring: 'ring-emerald-400' },
    { id: 'teal', label: 'Teal', base: 'bg-teal-100', text: 'text-teal-800', border: 'border-teal-200', dot: 'bg-teal-500', ring: 'ring-teal-400' },
    { id: 'cyan', label: 'Cyan', base: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-200', dot: 'bg-cyan-500', ring: 'ring-cyan-400' },
    { id: 'blue', label: 'Blue', base: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200', dot: 'bg-blue-500', ring: 'ring-blue-400' },
    { id: 'indigo', label: 'Indigo', base: 'bg-indigo-100', text: 'text-indigo-800', border: 'border-indigo-200', dot: 'bg-indigo-500', ring: 'ring-indigo-400' },
    { id: 'violet', label: 'Violet', base: 'bg-violet-100', text: 'text-violet-800', border: 'border-violet-200', dot: 'bg-violet-500', ring: 'ring-violet-400' },
    { id: 'purple', label: 'Purple', base: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200', dot: 'bg-purple-500', ring: 'ring-purple-400' },
    { id: 'fuchsia', label: 'Fuchsia', base: 'bg-fuchsia-100', text: 'text-fuchsia-800', border: 'border-fuchsia-200', dot: 'bg-fuchsia-500', ring: 'ring-fuchsia-400' },
    { id: 'pink', label: 'Pink', base: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-200', dot: 'bg-pink-500', ring: 'ring-pink-400' },
    { id: 'rose', label: 'Rose', base: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-200', dot: 'bg-rose-500', ring: 'ring-rose-400' },
];

const DEFAULT_EVENT_TYPE_COLORS: { [key: string]: EventTypeConfig } = {
    general: { base: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200', dot: 'bg-purple-500', name: 'General', id: 'purple' },
    academic: { base: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200', dot: 'bg-blue-500', name: 'Academic', id: 'blue' },
    deadline: { base: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', dot: 'bg-red-500', name: 'Deadline', id: 'red' },
    class: { base: 'bg-green-100', text: 'text-green-800', border: 'border-green-200', dot: 'bg-green-500', name: 'Class', id: 'green' },
    reminder: { base: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200', dot: 'bg-orange-500', name: 'Reminder', id: 'orange' },
};

const THEME_CONFIG: { [key: string]: any } = {
  blue: { name: 'Classic Blue', bg: 'bg-blue-600', text: 'text-blue-600', border: 'border-blue-600', ring: 'focus:ring-blue-500', swatch: 'bg-blue-600', selectedBg: 'bg-blue-50', todayBg: 'bg-blue-600' },
  purple: { name: 'Royal Purple', bg: 'bg-purple-600', text: 'text-purple-600', border: 'border-purple-600', ring: 'focus:ring-purple-500', swatch: 'bg-purple-600', selectedBg: 'bg-purple-50', todayBg: 'bg-purple-600' },
  green: { name: 'Forest Green', bg: 'bg-emerald-600', text: 'text-emerald-600', border: 'border-emerald-600', ring: 'focus:ring-emerald-500', swatch: 'bg-emerald-600', selectedBg: 'bg-emerald-50', todayBg: 'bg-emerald-600' },
  red: { name: 'Cherry Red', bg: 'bg-red-600', text: 'text-red-600', border: 'border-red-600', ring: 'focus:ring-red-500', swatch: 'bg-red-600', selectedBg: 'bg-red-50', todayBg: 'bg-red-600' },
  orange: { name: 'Sunset Orange', bg: 'bg-orange-500', text: 'text-orange-600', border: 'border-orange-500', ring: 'focus:ring-orange-500', swatch: 'bg-orange-500', selectedBg: 'bg-orange-50', todayBg: 'bg-orange-500' },
  cyan: { name: 'Ocean Blue', bg: 'bg-cyan-600', text: 'text-cyan-600', border: 'border-cyan-600', ring: 'focus:ring-cyan-500', swatch: 'bg-cyan-500', selectedBg: 'bg-cyan-50', todayBg: 'bg-cyan-600' },
  pink: { name: 'Hot Pink', bg: 'bg-pink-600', text: 'text-pink-600', border: 'border-pink-600', ring: 'focus:ring-pink-500', swatch: 'bg-pink-500', selectedBg: 'bg-pink-50', todayBg: 'bg-pink-600' },
  indigo: { name: 'Indigo Night', bg: 'bg-indigo-600', text: 'text-indigo-600', border: 'border-indigo-600', ring: 'focus:ring-indigo-500', swatch: 'bg-indigo-600', selectedBg: 'bg-indigo-50', todayBg: 'bg-indigo-600' },
  teal: { name: 'Teal Teal', bg: 'bg-teal-600', text: 'text-teal-600', border: 'border-teal-600', ring: 'focus:ring-teal-500', swatch: 'bg-teal-600', selectedBg: 'bg-teal-50', todayBg: 'bg-teal-600' },
  slate: { name: 'Slate Grey', bg: 'bg-slate-600', text: 'text-slate-600', border: 'border-slate-600', ring: 'focus:ring-slate-500', swatch: 'bg-slate-600', selectedBg: 'bg-slate-100', todayBg: 'bg-slate-600' },
};

const getMonthKey = (date: Date): string => `${date.getFullYear()}-${date.getMonth()}`;

const parseLocalDate = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
};

const formatDateToYYYYMMDD = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const isEventVisible = (event: Event, filters: FilterState) => {
    if (!filters.types.has(event.eventType)) return false;
    const visibility = event.isPublic ? 'public' : 'private';
    if (!filters.visibility.has(visibility)) return false;
    return true;
};

// --- Customization Modal ---

const ColorCustomizationModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    eventColors: { [key: string]: EventTypeConfig };
    onUpdateColor: (typeKey: string, colorOption: ColorOption) => void;
    onReset: () => void;
}> = ({ isOpen, onClose, eventColors, onUpdateColor, onReset }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[70] flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-gray-900 text-lg flex items-center">
                        <PaletteIcon className="h-5 w-5 mr-2 text-blue-600" />
                        Customize Event Colors
                    </h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 text-gray-500">
                        <XIcon className="h-5 w-5" />
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    {Object.entries(eventColors).map(([key, rawConfig]) => {
                        const config = rawConfig as EventTypeConfig;
                        return (
                        <div key={key} className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-gray-700">{config.name}</span>
                                <span className={`text-xs px-2 py-0.5 rounded ${config.base} ${config.text}`}>Preview</span>
                            </div>
                            <div className="grid grid-cols-8 gap-2">
                                {COLOR_PALETTE.map((color) => (
                                    <button
                                        key={color.id}
                                        onClick={() => onUpdateColor(key, color)}
                                        title={color.label}
                                        className={`h-8 w-8 rounded-full ${color.dot} hover:opacity-80 transition-all relative flex items-center justify-center`}
                                    >
                                        {config.id === color.id && (
                                            <CheckIcon className="h-4 w-4 text-white" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )})}
                </div>
                
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between">
                     <button 
                        onClick={onReset}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        Reset Defaults
                    </button>
                    <button 
                        onClick={onClose}
                        className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Calendar Theme Modal ---

const CalendarThemeModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    currentTheme: string;
    onSelectTheme: (themeKey: string) => void;
}> = ({ isOpen, onClose, currentTheme, onSelectTheme }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[90] flex justify-center items-center p-4 transition-opacity" onClick={onClose}>
            <div 
                className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up max-h-[80vh] flex flex-col" 
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="font-bold text-gray-900 text-lg">Calendar Theme</h3>
                        <p className="text-xs text-gray-500">Select a color scheme</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"><XIcon className="h-5 w-5 text-gray-600" /></button>
                </div>
                
                <div className="p-6 overflow-y-auto bg-white">
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                        {Object.entries(THEME_CONFIG).map(([key, config]) => (
                            <button
                                key={key}
                                onClick={() => onSelectTheme(key)}
                                className={`relative aspect-square rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 hover:shadow-lg overflow-hidden group bg-white ${
                                    currentTheme === key ? 'border-blue-500 ring-2 ring-blue-200 ring-offset-1' : 'border-gray-100 hover:border-gray-300'
                                }`}
                            >
                                <div className={`h-12 w-12 rounded-full ${config.swatch} shadow-sm flex items-center justify-center transition-transform group-hover:scale-110`}>
                                    {currentTheme === key && <CheckIcon className="h-6 w-6 text-white" />}
                                </div>
                                <span className="text-xs font-medium text-gray-700 text-center px-1">{config.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};


// --- macOS Style Components ---

const Sidebar: React.FC<{
    currentDate: Date;
    onSelectDate: (date: Date) => void;
    filters: FilterState;
    onFilterChange: (filters: FilterState) => void;
    theme: Theme;
    eventColors: { [key: string]: EventTypeConfig };
    onCustomizeClick: () => void;
}> = ({ currentDate, onSelectDate, filters, onFilterChange, theme, eventColors, onCustomizeClick }) => {
    const currentTheme = THEME_CONFIG[theme] || THEME_CONFIG.blue;

    const toggleType = (type: string) => {
        const newTypes = new Set(filters.types);
        if (newTypes.has(type)) newTypes.delete(type);
        else newTypes.add(type);
        onFilterChange({ ...filters, types: newTypes });
    };

    const toggleVisibility = (vis: 'public' | 'private') => {
        const newVisibility = new Set(filters.visibility);
        if (newVisibility.has(vis)) newVisibility.delete(vis);
        else newVisibility.add(vis);
        onFilterChange({ ...filters, visibility: newVisibility });
    };

    return (
        <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col hidden md:flex h-full overflow-y-auto">
            {/* Mini Calendar */}
            <div className="p-4 border-b border-gray-200">
                <MiniCalendar currentDate={currentDate} onSelectDate={onSelectDate} theme={theme} />
            </div>

            {/* Calendars List */}
            <div className="p-4 flex-1">
                <div className="mb-6">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 pl-2">Visibility</h3>
                    <div className="space-y-1">
                        {['public', 'private'].map((vis) => (
                            <div key={vis} className="flex items-center group">
                                <label className="flex items-center w-full cursor-pointer py-1 px-2 rounded-md hover:bg-gray-200/50 transition-colors">
                                    <input 
                                        type="checkbox" 
                                        checked={filters.visibility.has(vis as any)}
                                        onChange={() => toggleVisibility(vis as any)}
                                        className={`h-4 w-4 rounded border-gray-300 text-gray-600 focus:ring-0 focus:ring-offset-0 ${currentTheme.text}`} 
                                    />
                                    <span className="ml-3 text-sm text-gray-700 capitalize font-medium">{vis} Events</span>
                                </label>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <div className="flex items-center justify-between mb-3 pl-2 pr-1">
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Calendars</h3>
                        <button 
                            onClick={onCustomizeClick}
                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Customize Colors"
                        >
                            <PaletteIcon className="h-3.5 w-3.5" />
                        </button>
                    </div>
                    <div className="space-y-1">
                        {Object.entries(eventColors).map(([type, rawColors]) => {
                            const colors = rawColors as EventTypeConfig;
                            return (
                            <div key={type} className="flex items-center group">
                                <label className="flex items-center w-full cursor-pointer py-1 px-2 rounded-md hover:bg-gray-200/50 transition-colors">
                                    <input 
                                        type="checkbox" 
                                        checked={filters.types.has(type)}
                                        onChange={() => toggleType(type)}
                                        className="h-4 w-4 rounded border-gray-300 focus:ring-0 focus:ring-offset-0"
                                        style={{ color: 'currentColor' }} 
                                    />
                                    <span className={`ml-3 text-sm text-gray-700 font-medium flex-1`}>{colors.name}</span>
                                    <span className={`h-2.5 w-2.5 rounded-full ${colors.dot}`}></span>
                                </label>
                            </div>
                        )})}
                    </div>
                </div>
            </div>
        </div>
    );
};

const MiniCalendar: React.FC<{
    currentDate: Date;
    onSelectDate: (date: Date) => void;
    theme: Theme;
}> = ({ currentDate, onSelectDate, theme }) => {
    const [viewDate, setViewDate] = useState(currentDate);
    const currentTheme = THEME_CONFIG[theme] || THEME_CONFIG.blue;

    // Sync internal state when prop changes externally
    useEffect(() => {
        setViewDate(currentDate);
    }, [currentDate]);

    const days = useMemo(() => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysArr = [];

        for (let i = 0; i < firstDay.getDay(); i++) {
            daysArr.push(null);
        }
        for (let i = 1; i <= lastDay.getDate(); i++) {
            daysArr.push(new Date(year, month, i));
        }
        return daysArr;
    }, [viewDate]);

    const handlePrev = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    };
    const handleNext = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    };

    return (
        <div className="w-full">
            <div className="flex justify-between items-center mb-4 px-1">
                <span className="font-bold text-gray-800 text-sm">
                    {viewDate.toLocaleDateString('default', { month: 'long', year: 'numeric' })}
                </span>
                <div className="flex space-x-1">
                    <button onClick={handlePrev} className="p-1 hover:bg-gray-200 rounded-full text-gray-500"><ChevronLeftIcon className="h-3 w-3" /></button>
                    <button onClick={handleNext} className="p-1 hover:bg-gray-200 rounded-full text-gray-500"><ChevronRightIcon className="h-3 w-3" /></button>
                </div>
            </div>
            <div className="grid grid-cols-7 text-center mb-2">
                {['S','M','T','W','T','F','S'].map(d => (
                    <span key={d} className="text-[10px] font-medium text-gray-400">{d}</span>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-y-2 text-center">
                {days.map((day, i) => {
                    if (!day) return <div key={`empty-${i}`} />;
                    const isSelected = currentDate.toDateString() === day.toDateString();
                    const isToday = new Date().toDateString() === day.toDateString();
                    
                    let dayClass = "h-6 w-6 mx-auto flex items-center justify-center text-xs rounded-full cursor-pointer transition-all duration-300 ease-in-out transform";
                    if (isSelected) {
                         dayClass += ` text-white ${currentTheme.bg} font-semibold scale-110 shadow-md`;
                    } else if (isToday) {
                         // Use theme color for today if not selected, or just red if user prefers distinct today marker.
                         // Messenger style usually emphasizes primary color.
                         dayClass += ` ${currentTheme.text} font-bold hover:bg-gray-100`;
                    } else {
                        dayClass += " text-gray-700 hover:bg-gray-200";
                    }

                    return (
                        <div key={day.toISOString()} onClick={() => onSelectDate(day)}>
                            <div className={dayClass}>{day.getDate()}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// --- Main Grid Views ---

interface ViewProps {
    currentDate: Date;
    selectedDate: Date;
    onDayClick: (day: Date) => void;
    onDoubleClickDay: (day: Date) => void;
    eventsCache: { [key: string]: Event[] };
    theme: Theme;
    user: User;
    creatorProfiles: { [userId: string]: { full_name: string } };
    draggedEvent: Event | null;
    dropTargetDate: Date | null;
    onEventDragStart: (e: React.DragEvent, event: Event) => void;
    onDayDragOver: (e: React.DragEvent, day: Date) => void;
    onDayDragLeave: (e: React.DragEvent) => void;
    onDayDrop: (e: React.DragEvent, day: Date) => void;
    onEventDragEnd: (e: React.DragEvent) => void;
    filters: FilterState;
    eventColors: { [key: string]: EventTypeConfig };
}

const MonthView: React.FC<Omit<ViewProps, 'currentDate'> & { currentDate: Date }> = ({ currentDate, selectedDate, onDayClick, onDoubleClickDay, eventsCache, theme, user, creatorProfiles, draggedEvent, dropTargetDate, onEventDragStart, onDayDragOver, onDayDragLeave, onDayDrop, onEventDragEnd, filters, eventColors }) => {
    const calendarGrid = useMemo(() => {
        const days = [];
        const month = currentDate.getMonth();
        const year = currentDate.getFullYear();
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        
        const prevMonthLastDay = new Date(year, month, 0);
        const prevMonthDays = firstDayOfMonth.getDay();
        
        for (let i = prevMonthDays; i > 0; i--) {
            days.push(new Date(year, month - 1, prevMonthLastDay.getDate() - i + 1));
        }
        
        for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
            days.push(new Date(year, month, day));
        }

        const nextMonthDays = 6 - lastDayOfMonth.getDay();
        for (let i = 1; i <= nextMonthDays; i++) {
            days.push(new Date(year, month + 1, i));
        }

        while (days.length < 42) {
            const lastDay = days[days.length - 1];
            days.push(new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate() + 1));
        }
        
        return days;
    }, [currentDate]);

    const displayedEvents = eventsCache[getMonthKey(currentDate)] || [];
    const currentTheme = THEME_CONFIG[theme] || THEME_CONFIG.blue;

    return (
        <div className="flex flex-col h-full bg-white">
            <div className="grid grid-cols-7 border-b border-gray-200 flex-shrink-0">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="py-2 text-right pr-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {day}
                    </div>
                ))}
            </div>
            {/* Use grid-rows-6 to strictly enforce row height, and min-h-0 to prevent parent expansion */}
            <div className="grid grid-cols-7 grid-rows-6 flex-1 min-h-0">
                {calendarGrid.map((day, index) => {
                    const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                    const isToday = day.toDateString() === new Date().toDateString();
                    const isSelected = selectedDate && day.toDateString() === selectedDate.toDateString();
                    const dayEvents = displayedEvents
                        .filter(e => parseLocalDate(e.eventDate).toDateString() === day.toDateString())
                        .filter(e => isEventVisible(e, filters));
                        
                    const isDropTarget = dropTargetDate?.toDateString() === day.toDateString() && draggedEvent;
                    const borderClass = `border-gray-100 ${index % 7 !== 6 ? 'border-r' : ''} ${index < 35 ? 'border-b' : ''}`;

                    return (
                        <div
                            key={day.toISOString()}
                            className={`p-1 flex flex-col relative group transition-colors min-h-0
                                ${borderClass}
                                ${isDropTarget ? 'bg-blue-50 ring-2 ring-inset ring-blue-300' : isSelected ? 'bg-gray-50/30' : 'bg-white hover:bg-gray-50'}
                                ${!isCurrentMonth ? 'bg-gray-50/30 text-gray-400' : ''}
                            `}
                            onClick={() => onDayClick(day)}
                            onDoubleClick={() => onDoubleClickDay(day)}
                            onDragOver={(e) => onDayDragOver(e, day)}
                            onDragEnter={(e) => onDayDragOver(e, day)}
                            onDragLeave={onDayDragLeave}
                            onDrop={(e) => onDayDrop(e, day)}
                        >
                           <div className="flex justify-end p-1">
                               <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full transition-all duration-300 ease-in-out transform
                                    ${isToday 
                                        ? `${currentTheme.todayBg} text-white font-bold shadow-sm ${isSelected ? 'scale-110 ring-2 ring-offset-1' : ''}` 
                                        : isSelected 
                                            ? `${currentTheme.bg} text-white font-semibold shadow-sm scale-110`
                                            : isCurrentMonth ? 'text-gray-700 group-hover:bg-gray-200' : 'text-gray-300'}
                               `}>
                                    {day.getDate()}
                                </span>
                           </div>
                             {/* Added min-h-0 to this flex child to allow it to shrink and enable overflow-hidden */}
                             <div className="flex-1 overflow-hidden space-y-1 pb-1 px-1 min-h-0">
                                {dayEvents.slice(0, 4).map(event => {
                                     const color = eventColors[event.eventType] || eventColors.general;
                                     const isOwner = event.userId === user.id;
                                     return (
                                         <div key={event.id}
                                             draggable={isOwner}
                                             onDragStart={(e) => isOwner && onEventDragStart(e, event)}
                                             onDragEnd={onEventDragEnd}
                                             className={`
                                                group/event w-full text-[10px] sm:text-xs rounded-sm px-1.5 py-0.5 truncate leading-tight font-medium shadow-sm
                                                ${color.base} ${color.text} ${isOwner ? 'cursor-move' : ''} 
                                                ${draggedEvent?.id === event.id ? 'opacity-50' : 'hover:opacity-90'}
                                                flex items-center gap-1
                                             `}
                                             title={event.title}
                                         >
                                            {!event.isPublic && <LockClosedIcon className="h-2.5 w-2.5 flex-shrink-0 opacity-70" />}
                                            <span className="truncate">{event.title}</span>
                                         </div>
                                     );
                                 })}
                                 {dayEvents.length > 4 && (
                                     <div className="text-[10px] text-gray-400 pl-1 font-medium">
                                         +{dayEvents.length - 4} more...
                                     </div>
                                 )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const WeekView: React.FC<Omit<ViewProps, 'currentDate'> & { currentDate: Date }> = ({ currentDate, selectedDate, onDayClick, onDoubleClickDay, eventsCache, theme, user, creatorProfiles, draggedEvent, dropTargetDate, onEventDragStart, onDayDragOver, onDayDragLeave, onDayDrop, onEventDragEnd, filters, eventColors }) => {
    const weekDays = useMemo(() => {
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
        return Array.from({ length: 7 }, (_, i) => {
            const day = new Date(startOfWeek);
            day.setDate(startOfWeek.getDate() + i);
            return day;
        });
    }, [currentDate]);

    const currentTheme = THEME_CONFIG[theme] || THEME_CONFIG.blue;

    return (
        <div className="flex flex-col h-full bg-white">
            <div className="grid grid-cols-7 border-b border-gray-200">
                {weekDays.map((day, i) => {
                     const isToday = day.toDateString() === new Date().toDateString();
                     const isSelected = selectedDate && day.toDateString() === selectedDate.toDateString();
                     return (
                        <div key={day.toISOString()} className={`py-3 text-center border-r border-gray-100 last:border-r-0`}>
                            <div className={`text-xs font-semibold uppercase ${isToday ? currentTheme.text : 'text-gray-500'}`}>
                                {day.toLocaleDateString('en-US', { weekday: 'short' })}
                            </div>
                            <div className={`mt-1 mx-auto w-8 h-8 flex items-center justify-center rounded-full text-lg transition-all duration-300 ease-in-out transform ${
                                isToday 
                                    ? `${currentTheme.todayBg} text-white font-bold shadow-md` 
                                    : isSelected 
                                        ? `${currentTheme.bg} text-white font-semibold shadow-md scale-110` 
                                        : 'text-gray-800 font-normal hover:bg-gray-100'
                            }`}>
                                {day.getDate()}
                            </div>
                        </div>
                    )
                })}
            </div>
            <div className="grid grid-cols-7 flex-1 bg-white overflow-y-auto">
                {weekDays.map((day, i) => {
                    const isSelected = selectedDate && day.toDateString() === selectedDate.toDateString();
                    const dayEvents = (eventsCache[getMonthKey(day)] || [])
                        .filter(e => parseLocalDate(e.eventDate).toDateString() === day.toDateString())
                        .filter(e => isEventVisible(e, filters))
                        .sort((a, b) => (a.eventTime || '').localeCompare(b.eventTime || ''));
                    
                    const isDropTarget = dropTargetDate?.toDateString() === day.toDateString() && draggedEvent;
                    const isToday = day.toDateString() === new Date().toDateString();

                    return (
                        <div
                            key={day.toISOString()}
                            className={`border-r border-gray-100 last:border-r-0 p-1 flex flex-col gap-2 min-h-[200px]
                                ${isDropTarget ? 'bg-blue-50 ring-inset ring-2 ring-blue-300' : isSelected ? 'bg-gray-50' : ''}
                                ${isToday && !isSelected ? 'bg-gray-50/30' : ''}
                            `}
                            onClick={() => onDayClick(day)}
                            onDoubleClick={() => onDoubleClickDay(day)}
                            onDragOver={(e) => onDayDragOver(e, day)}
                            onDragEnter={(e) => onDayDragOver(e, day)}
                            onDragLeave={onDayDragLeave}
                            onDrop={(e) => onDayDrop(e, day)}
                        >
                            {dayEvents.map(event => {
                                const color = eventColors[event.eventType] || eventColors.general;
                                const isOwner = event.userId === user.id;
                                return (
                                    <div key={event.id}
                                        draggable={isOwner}
                                        onDragStart={(e) => isOwner && onEventDragStart(e, event)}
                                        onDragEnd={onEventDragEnd}
                                        className={`p-2 rounded-md shadow-sm border-l-4 ${color.border.replace('border-', 'border-l-')} bg-white hover:bg-gray-50 transition-all ${isOwner ? 'cursor-move' : ''} ${draggedEvent?.id === event.id ? 'opacity-30' : ''}`}
                                    >
                                        <p className={`text-xs font-bold ${color.text} flex items-center`}>
                                             {!event.isPublic && <LockClosedIcon className="h-3 w-3 mr-1 flex-shrink-0" />}
                                            {event.title}
                                        </p>
                                        <div className="flex justify-between items-end mt-1">
                                            <span className="text-[10px] text-gray-500">
                                                {event.eventTime ? new Date(`1970-01-01T${event.eventTime}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'All Day'}
                                            </span>
                                            <span className={`h-1.5 w-1.5 rounded-full ${color.dot}`}></span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const DayView: React.FC<{ 
    selectedDate: Date, 
    onAddEventForDay: (day: Date) => void, 
    eventsCache: { [key: string]: Event[] },
    theme: Theme,
    creatorProfiles: { [userId: string]: { full_name: string } },
    filters: FilterState,
    eventColors: { [key: string]: EventTypeConfig }
}> = ({ selectedDate, onAddEventForDay, eventsCache, theme, creatorProfiles, filters, eventColors }) => {
    const dayEvents = (eventsCache[getMonthKey(selectedDate)] || [])
        .filter(e => parseLocalDate(e.eventDate).toDateString() === selectedDate.toDateString())
        .filter(e => isEventVisible(e, filters))
        .sort((a, b) => (a.eventTime || '').localeCompare(b.eventTime || ''));

    const currentTheme = THEME_CONFIG[theme] || THEME_CONFIG.blue;

    return (
        <div className="h-full flex flex-col bg-white">
            <div className="p-6 border-b border-gray-200 flex justify-between items-end bg-gray-50">
                <div>
                    <h2 className="text-4xl font-bold text-gray-900">{selectedDate.getDate()}</h2>
                    <p className="text-xl text-gray-500 font-medium">{selectedDate.toLocaleDateString('default', { weekday: 'long', month: 'long', year: 'numeric' })}</p>
                </div>
                <button onClick={() => onAddEventForDay(selectedDate)} className={`px-4 py-2 rounded-md text-sm font-medium text-white ${currentTheme.bg} hover:opacity-90 shadow-sm`}>
                    Add Event
                </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-3xl mx-auto space-y-4">
                    {dayEvents.length === 0 ? (
                        <div className="text-center py-20 border-2 border-dashed border-gray-200 rounded-xl">
                            <CalendarIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 font-medium">No events for this day.</p>
                        </div>
                    ) : (
                        dayEvents.map(event => {
                            const color = eventColors[event.eventType] || eventColors.general;
                            const creator = event.isPublic && event.userId ? creatorProfiles[event.userId] : null;
                            return (
                                <div key={event.id} className="flex items-start group">
                                    <div className="w-24 pt-3 text-right text-gray-500 text-sm font-medium pr-6 flex-shrink-0">
                                        {event.eventTime ? new Date(`1970-01-01T${event.eventTime}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'All Day'}
                                    </div>
                                    <div className={`flex-1 p-4 rounded-lg border ${color.border} ${color.base} relative`}>
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${color.dot.replace('bg-', 'bg-')}`}></div>
                                        <div className="flex justify-between items-start">
                                            <h3 className={`font-bold text-gray-900 text-lg ${color.text}`}>{event.title}</h3>
                                            {!event.isPublic && <LockClosedIcon className="h-4 w-4 text-gray-400 opacity-60" />}
                                        </div>
                                        {event.description && <p className="text-gray-600 mt-1 text-sm">{event.description}</p>}
                                        <div className="mt-3 flex items-center justify-between text-xs">
                                            <span className={`px-2 py-1 rounded-md bg-white/60 font-medium ${color.text}`}>{color.name}</span>
                                            {creator && <span className="text-gray-500">Created by {creator.full_name}</span>}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

const YearView: React.FC<{ currentDate: Date, onMonthClick: (date: Date) => void, theme: Theme }> = ({ currentDate, onMonthClick, theme }) => {
    const months = Array.from({ length: 12 }, (_, i) => new Date(currentDate.getFullYear(), i, 1));
    const currentTheme = THEME_CONFIG[theme] || THEME_CONFIG.blue;

    return (
        <div className="h-full overflow-y-auto p-8 bg-white">
             <h2 className="text-3xl font-bold text-gray-900 mb-8">{currentDate.getFullYear()}</h2>
             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-10 pb-20">
                {months.map(month => (
                    <div key={month.toISOString()} className="flex flex-col">
                        <button
                            onClick={() => onMonthClick(month)}
                            className={`text-lg font-bold ${currentTheme.text} mb-3 text-left hover:underline`}
                        >
                            {month.toLocaleDateString('default', { month: 'long' })}
                        </button>
                        <div className="grid grid-cols-7 gap-y-2 text-center text-xs text-gray-800">
                            {['S','M','T','W','T','F','S'].map(d => <span key={d} className="text-gray-400 font-medium">{d}</span>)}
                            {Array.from({ length: new Date(month.getFullYear(), month.getMonth(), 1).getDay() }).map((_, i) => (
                                <div key={`empty-${i}`} />
                            ))}
                            {Array.from({ length: new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() }).map((_, i) => {
                                const day = new Date(month.getFullYear(), month.getMonth(), i + 1);
                                const isToday = day.toDateString() === new Date().toDateString();
                                return (
                                    <div key={i} className={`h-6 w-6 mx-auto flex items-center justify-center rounded-full ${isToday ? `${currentTheme.todayBg} text-white font-bold` : ''}`}>
                                        {i + 1}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Main Component ---

const CalendarPage: React.FC<CalendarPageProps> = ({ user, theme, onThemeChange }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [view, setView] = useState<View>('month');
    const [eventsCache, setEventsCache] = useState<{ [key: string]: Event[] }>({});
    const [creatorProfiles, setCreatorProfiles] = useState<{ [userId: string]: { full_name: string } }>({});
    
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [selectedDayForModal, setSelectedDayForModal] = useState<Date | null>(null);
    const [draggedEvent, setDraggedEvent] = useState<Event | null>(null);
    const [dropTargetDate, setDropTargetDate] = useState<Date | null>(null);
    const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
    
    // Custom Color State
    const [eventColors, setEventColors] = useState(DEFAULT_EVENT_TYPE_COLORS);
    const [isColorModalOpen, setIsColorModalOpen] = useState(false);

    const [filters, setFilters] = useState<FilterState>({
        types: new Set(Object.keys(DEFAULT_EVENT_TYPE_COLORS)),
        visibility: new Set(['public', 'private']),
    });

    const handleDateJump = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.value) return;
        const newDate = parseLocalDate(e.target.value);
        setCurrentDate(newDate);
        setSelectedDate(newDate);
        if (view === 'year') setView('month');
    };

    // Load custom colors from profile
    useEffect(() => {
        const loadColors = async () => {
            try {
                const doc = await db.collection('profiles').doc(user.id).get();
                if (doc.exists) {
                    const data = doc.data();
                    if (data?.calendar_colors) {
                        setEventColors(prev => ({ ...prev, ...data.calendar_colors }));
                    }
                }
            } catch (err) {
                console.error("Error loading custom colors:", err);
            }
        };
        loadColors();
    }, [user.id]);

    const saveCustomColors = async (newColors: typeof DEFAULT_EVENT_TYPE_COLORS) => {
        setEventColors(newColors);
        try {
            await db.collection('profiles').doc(user.id).set({
                calendar_colors: newColors
            }, { merge: true });
        } catch (err) {
            console.error("Error saving custom colors:", err);
        }
    };

    const handleUpdateColor = (typeKey: string, colorOption: ColorOption) => {
        const updated = {
            ...eventColors,
            [typeKey]: {
                ...eventColors[typeKey],
                id: colorOption.id,
                base: colorOption.base,
                text: colorOption.text,
                border: colorOption.border,
                dot: colorOption.dot,
            }
        };
        saveCustomColors(updated);
    };
    
    const handleResetColors = () => {
        saveCustomColors(DEFAULT_EVENT_TYPE_COLORS);
    };

     useEffect(() => {
        const fetchEvents = async () => {
            const monthKey = getMonthKey(currentDate);
            const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
            const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
            
            const startGrid = new Date(startOfMonth);
            startGrid.setDate(startGrid.getDate() - 7);
            const endGrid = new Date(endOfMonth);
            endGrid.setDate(endGrid.getDate() + 14);

            const startStr = formatDateToYYYYMMDD(startGrid);
            const endStr = formatDateToYYYYMMDD(endGrid);

            const publicQuery = db.collection('events')
                .where('isPublic', '==', true)
                .where('eventDate', '>=', startStr)
                .where('eventDate', '<=', endStr);

            const privateQuery = db.collection('events')
                .where('userId', '==', user.id)
                .where('isPublic', '==', false)
                .where('eventDate', '>=', startStr)
                .where('eventDate', '<=', endStr);

            const unsubscribePublic = publicQuery.onSnapshot((snapshot: any) => {
                const publicEvents = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as Event[];
                 const newUserIds = new Set(publicEvents.map(e => e.userId).filter(id => id && !creatorProfiles[id]));
                if (newUserIds.size > 0) {
                     newUserIds.forEach(uid => {
                         db.collection('profiles').doc(uid).get().then((doc: any) => {
                             if(doc.exists) setCreatorProfiles(prev => ({...prev, [uid]: doc.data()}));
                         });
                     });
                }
                updateEventsCache(monthKey, publicEvents, 'public');
            });

            const unsubscribePrivate = privateQuery.onSnapshot((snapshot: any) => {
                const privateEvents = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as Event[];
                updateEventsCache(monthKey, privateEvents, 'private');
            });

            return () => {
                unsubscribePublic();
                unsubscribePrivate();
            };
        };
        fetchEvents();
    }, [currentDate, user.id]);

    const updateEventsCache = (key: string, newEvents: Event[], type: 'public' | 'private') => {
        setEventsCache(prev => {
            const currentMonthEvents = prev[key] || [];
            const otherEvents = currentMonthEvents.filter(e => (type === 'public' ? !e.isPublic : e.isPublic));
            return { ...prev, [key]: [...otherEvents, ...newEvents] };
        });
    };

    const handlePrev = () => {
        const newDate = new Date(currentDate);
        if (view === 'year') newDate.setFullYear(newDate.getFullYear() - 1);
        else newDate.setMonth(newDate.getMonth() - 1);
        setCurrentDate(newDate);
    };

    const handleNext = () => {
        const newDate = new Date(currentDate);
        if (view === 'year') newDate.setFullYear(newDate.getFullYear() + 1);
        else newDate.setMonth(newDate.getMonth() + 1);
        setCurrentDate(newDate);
    };

    const handleToday = () => {
        const now = new Date();
        setCurrentDate(now);
        setSelectedDate(now);
    };
    
    const handleDayClick = (day: Date) => {
        setSelectedDate(day);
    };

    const handleMonthClick = (date: Date) => {
        setCurrentDate(date);
        setView('month');
    }

    const handleAddEventForDay = (day: Date) => {
        setSelectedDayForModal(day);
        setIsEventModalOpen(true);
    };

     const createEvent = async (eventData: any) => {
        await db.collection('events').add({ ...eventData, userId: user.id, createdAt: firestore.FieldValue.serverTimestamp() });
    };
    const deleteEvent = async (eventId: string) => await db.collection('events').doc(eventId).delete();
    
    const handleEventDragStart = (e: React.DragEvent, event: Event) => {
        setDraggedEvent(event);
        e.dataTransfer.effectAllowed = 'move';
    };
    const handleDayDragOver = (e: React.DragEvent, day: Date) => {
        e.preventDefault();
        if (!draggedEvent) return;
        setDropTargetDate(day);
        e.dataTransfer.dropEffect = 'move';
    };
    const handleDayDragLeave = () => {};
    const handleDayDrop = async (e: React.DragEvent, day: Date) => {
        e.preventDefault();
        if (!draggedEvent) return;
        const newDateStr = formatDateToYYYYMMDD(day);
        if (draggedEvent.eventDate !== newDateStr) {
            await db.collection('events').doc(draggedEvent.id).update({ eventDate: newDateStr });
        }
        setDraggedEvent(null);
        setDropTargetDate(null);
    };
    const handleEventDragEnd = () => {
        setDraggedEvent(null);
        setDropTargetDate(null);
    };

    // Swipe State and Handlers
    const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
    const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);
    const minSwipeDistance = 50;

    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
    };

    const onTouchMove = (e: React.TouchEvent) => {
        setTouchEnd({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distanceX = touchStart.x - touchEnd.x;
        const distanceY = touchStart.y - touchEnd.y;
        const isLeftSwipe = distanceX > minSwipeDistance;
        const isRightSwipe = distanceX < -minSwipeDistance;
        
        // Only trigger horizontal swipe if horizontal distance is greater than vertical distance
        // This prevents accidental swipes when scrolling vertically
        if (Math.abs(distanceX) > Math.abs(distanceY)) {
             if (isLeftSwipe) handleNext();
             if (isRightSwipe) handlePrev();
        }
    };

    const selectedDayEvents = selectedDayForModal 
        ? (eventsCache[getMonthKey(selectedDayForModal)] || [])
            .filter(e => parseLocalDate(e.eventDate).toDateString() === selectedDayForModal.toDateString())
            .filter(e => isEventVisible(e, filters))
        : [];
        
    return (
        <div className="flex h-full bg-white text-gray-900 font-sans overflow-hidden rounded-lg shadow-sm border border-gray-200">
            <ColorCustomizationModal 
                isOpen={isColorModalOpen}
                onClose={() => setIsColorModalOpen(false)}
                eventColors={eventColors}
                onUpdateColor={handleUpdateColor}
                onReset={handleResetColors}
            />
            
            <CalendarThemeModal
                isOpen={isThemeModalOpen}
                onClose={() => setIsThemeModalOpen(false)}
                currentTheme={theme}
                onSelectTheme={(t) => { onThemeChange(t); setIsThemeModalOpen(false); }}
            />
            
            {/* Sidebar */}
            <Sidebar 
                currentDate={currentDate} 
                onSelectDate={(d) => { setCurrentDate(d); setSelectedDate(d); }}
                filters={filters}
                onFilterChange={setFilters}
                theme={theme}
                eventColors={eventColors}
                onCustomizeClick={() => setIsColorModalOpen(true)}
            />

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 bg-white">
                {/* Toolbar */}
                 <header className="border-b border-gray-200 flex flex-col md:flex-row items-center justify-between p-4 bg-white flex-shrink-0 z-10 gap-4 md:h-16 md:py-0 md:px-6">
                    <div className="flex items-center justify-between w-full md:w-auto">
                        <div className="flex items-center space-x-3 md:space-x-4">
                            {/* Navigation Group */}
                            <div className="flex items-center rounded-md shadow-sm border border-gray-300 bg-white">
                                <button onClick={handlePrev} className="px-2 py-1 hover:bg-gray-50 border-r border-gray-300 rounded-l-md text-gray-600">
                                    <ChevronLeftIcon className="h-5 w-5" />
                                </button>
                                <button onClick={handleToday} className="px-3 md:px-4 py-1 text-xs md:text-sm font-medium text-gray-700 hover:bg-gray-50">
                                    Today
                                </button>
                                <button onClick={handleNext} className="px-2 py-1 hover:bg-gray-50 border-l border-gray-300 rounded-r-md text-gray-600">
                                    <ChevronRightIcon className="h-5 w-5" />
                                </button>
                            </div>
                            
                            <div className="relative flex items-center">
                                <div className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors group pointer-events-none">
                                     <h2 className="text-sm md:text-xl font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                                        {view === 'year' 
                                            ? currentDate.getFullYear() 
                                            : currentDate.toLocaleDateString('default', { month: 'short', year: 'numeric' })} 
                                    </h2>
                                    <ChevronDownIcon className="h-4 w-4 md:h-5 md:w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                                </div>
                                <input
                                    type="date"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    onChange={handleDateJump}
                                    value={formatDateToYYYYMMDD(currentDate)}
                                    title="Jump to date"
                                    onClick={(e) => {
                                        try {
                                            // Force the picker to show on supported browsers
                                            if ('showPicker' in e.currentTarget) {
                                                e.currentTarget.showPicker();
                                            }
                                        } catch {
                                            // Fallback handled natively by browser or ignored
                                        }
                                    }}
                                />
                            </div>
                        </div>
                        {/* Mobile Add Button */}
                         <button 
                            onClick={() => handleAddEventForDay(selectedDate)}
                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-full md:hidden"
                            title="Add Event"
                        >
                            <PlusIcon className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="flex items-center w-full md:w-auto justify-between md:justify-end space-x-4">
                        {/* View Switcher Segmented Control */}
                        <div className="flex flex-col md:flex-row md:items-center md:space-x-4 w-full md:w-auto gap-2 md:gap-0">
                             <div className="flex bg-gray-100 p-1 rounded-lg w-full md:w-auto order-2 md:order-1">
                                {(['day', 'week', 'month', 'year'] as View[]).map((v) => (
                                    <button
                                        key={v}
                                        onClick={() => setView(v)}
                                        className={`flex-1 md:flex-none px-3 md:px-4 py-1 text-xs font-medium rounded-md capitalize transition-all text-center ${
                                            view === v 
                                            ? 'bg-white text-gray-900 shadow-sm' 
                                            : 'text-gray-500 hover:text-gray-900'
                                        }`}
                                    >
                                        {v}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Theme Selector */}
                        <button
                            onClick={() => setIsThemeModalOpen(true)}
                            className="p-2 rounded-full transition-colors hover:bg-gray-100 text-gray-500"
                            title="Change Theme"
                        >
                            <PaletteIcon className="h-5 w-5" />
                        </button>

                        {/* Desktop Add Button */}
                        <button 
                            onClick={() => handleAddEventForDay(selectedDate)}
                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-full hidden md:block"
                            title="Add Event"
                        >
                            <PlusIcon className="h-5 w-5" />
                        </button>
                    </div>
                </header>

                {/* Grid */}
                <div 
                    className="flex-1 overflow-hidden relative"
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                >
                    {view === 'month' && <MonthView currentDate={currentDate} selectedDate={selectedDate} onDayClick={handleDayClick} onDoubleClickDay={handleAddEventForDay} eventsCache={eventsCache} theme={theme} user={user} creatorProfiles={creatorProfiles} draggedEvent={draggedEvent} dropTargetDate={dropTargetDate} onEventDragStart={handleEventDragStart} onDayDragOver={handleDayDragOver} onDayDragLeave={handleDayDragLeave} onDayDrop={handleDayDrop} onEventDragEnd={handleEventDragEnd} filters={filters} eventColors={eventColors} />}
                    {view === 'week' && <WeekView currentDate={currentDate} selectedDate={selectedDate} onDayClick={handleDayClick} onDoubleClickDay={handleAddEventForDay} eventsCache={eventsCache} theme={theme} user={user} creatorProfiles={creatorProfiles} draggedEvent={draggedEvent} dropTargetDate={dropTargetDate} onEventDragStart={handleEventDragStart} onDayDragOver={handleDayDragOver} onDayDragLeave={handleDayDragLeave} onDayDrop={handleDayDrop} onEventDragEnd={handleEventDragEnd} filters={filters} eventColors={eventColors} />}
                    {view === 'day' && <DayView selectedDate={selectedDate} onAddEventForDay={handleAddEventForDay} eventsCache={eventsCache} theme={theme} creatorProfiles={creatorProfiles} filters={filters} eventColors={eventColors} />}
                    {view === 'year' && <YearView currentDate={currentDate} onMonthClick={handleMonthClick} theme={theme} />}
                </div>
            </div>

            <DayEventsModal 
                isOpen={isEventModalOpen}
                onClose={() => setIsEventModalOpen(false)}
                date={selectedDayForModal}
                events={selectedDayEvents}
                onAddEvent={createEvent}
                onDeleteEvent={deleteEvent}
                user={user}
                creatorProfiles={creatorProfiles}
                theme={theme}
                eventColors={eventColors}
            />
        </div>
    );
};

const DayEventsModal: React.FC<any> = ({ isOpen, onClose, date, events, onAddEvent, onDeleteEvent, user, creatorProfiles, theme, eventColors }) => {
    const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
    const [newEventTitle, setNewEventTitle] = useState('');
    const [newEventDesc, setNewEventDesc] = useState('');
    const [newEventTime, setNewEventTime] = useState('');
    const [eventType, setEventType] = useState('general');
    const [isPublic, setIsPublic] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const currentTheme = THEME_CONFIG[theme] || THEME_CONFIG.blue;

    useEffect(() => {
        if (isOpen) {
            setActiveTab(events.length === 0 ? 'add' : 'list');
            setNewEventTitle(''); setNewEventDesc(''); setNewEventTime(''); setEventType('general'); setIsPublic(false);
        }
    }, [isOpen, events.length]);

    if (!isOpen || !date) return null;

    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        await onAddEvent({ title: newEventTitle, description: newEventDesc, eventDate: formatDateToYYYYMMDD(date), eventTime: newEventTime || null, eventType, isPublic, tags: [] });
        setIsSubmitting(false);
        setActiveTab('list');
    };

    return (
        <div className="fixed inset-0 bg-black/40 z-[60] flex justify-center items-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">{date.toLocaleDateString('default', { weekday: 'long' })}</h3>
                        <p className="text-sm text-gray-500">{date.toLocaleDateString('default', { month: 'long', day: 'numeric' })}</p>
                    </div>
                    <div className="flex space-x-2">
                        <button onClick={() => setActiveTab('list')} className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${activeTab === 'list' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}>List</button>
                        <button onClick={() => setActiveTab('add')} className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${activeTab === 'add' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}>Add</button>
                    </div>
                </div>

                <div className="p-4 overflow-y-auto flex-1 bg-gray-50/50">
                    {activeTab === 'list' ? (
                        <div className="space-y-3">
                            {events.length === 0 && <p className="text-center text-gray-400 text-sm py-4">No events.</p>}
                            {events.map((event: any) => {
                                const color = eventColors[event.eventType] || eventColors.general;
                                const isOwner = event.userId === user.id;
                                return (
                                    <div key={event.id} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                                        <div className="flex justify-between">
                                            <span className={`text-xs px-1.5 py-0.5 rounded ${color.base} ${color.text} font-medium capitalize`}>{event.eventType}</span>
                                            {isOwner && <button onClick={() => onDeleteEvent(event.id)} className="text-gray-400 hover:text-red-500"><TrashIcon className="h-4 w-4" /></button>}
                                        </div>
                                        <h4 className="font-bold text-gray-800 mt-1">{event.title}</h4>
                                        {event.description && <p className="text-xs text-gray-600 mt-1">{event.description}</p>}
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <form onSubmit={handleAddSubmit} className="space-y-4">
                            <input type="text" value={newEventTitle} onChange={e => setNewEventTitle(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md text-sm" placeholder="Event Title" required />
                            <div className="grid grid-cols-2 gap-2">
                                <select value={eventType} onChange={e => setEventType(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md text-sm">
                                    {Object.keys(eventColors).map(t => <option key={t} value={t}>{eventColors[t].name}</option>)}
                                </select>
                                <input type="time" value={newEventTime} onChange={e => setNewEventTime(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md text-sm" />
                            </div>
                            <textarea value={newEventDesc} onChange={e => setNewEventDesc(e.target.value)} rows={3} className="w-full p-2 border border-gray-300 rounded-md text-sm" placeholder="Details..." />
                            <div className="flex items-center">
                                <input type="checkbox" id="isPublic" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} className="rounded text-blue-600" />
                                <label htmlFor="isPublic" className="ml-2 text-sm text-gray-600">Public Event</label>
                            </div>
                            <button type="submit" disabled={isSubmitting} className={`w-full py-2 rounded-md text-white font-medium text-sm ${currentTheme.bg} hover:opacity-90`}>{isSubmitting ? 'Saving...' : 'Save'}</button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CalendarPage;
