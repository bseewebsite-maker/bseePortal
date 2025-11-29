
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services';
import type { User } from '@supabase/supabase-js';
import type { AttendanceRecord } from '../types';
import { Spinner } from './Spinner';
import { 
    AttendanceIcon, 
    CheckCircleIcon, 
    XIcon, 
    ClockIcon, 
    InformationCircleIcon, 
    ChevronLeftIcon, 
    ChevronRightIcon,
    CalendarIcon 
} from './Icons';

interface AttendancePageProps {
    user: User;
}

const AttendancePage: React.FC<AttendancePageProps> = ({ user }) => {
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, excused: 0 });
    const [viewDate, setViewDate] = useState(new Date());

    useEffect(() => {
        const fetchAttendance = async () => {
            setLoading(true);
            setError(null);
            try {
                // Fetch all records for the user
                const snapshot = await db.collection('attendance')
                    .where('userId', '==', user.id)
                    .get();

                const records = snapshot.docs.map((doc: any) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as AttendanceRecord[];

                // Sort records by date descending (newest first) client-side
                records.sort((a, b) => {
                    if (a.date < b.date) return 1;
                    if (a.date > b.date) return -1;
                    return 0;
                });

                setAttendanceRecords(records);

                // Calculate All-Time Stats
                const newStats = records.reduce((acc, record) => {
                    const status = record.status.toLowerCase();
                    if (status === 'present') acc.present++;
                    else if (status === 'absent') acc.absent++;
                    else if (status === 'late') acc.late++;
                    else if (status === 'excused') acc.excused++;
                    return acc;
                }, { present: 0, absent: 0, late: 0, excused: 0 });

                setStats(newStats);

            } catch (err: any) {
                console.error("Error fetching attendance:", err);
                setError("Failed to load attendance records.");
            } finally {
                setLoading(false);
            }
        };

        fetchAttendance();
    }, [user.id]);

    const filteredRecords = useMemo(() => {
        return attendanceRecords.filter(record => {
            const recordDate = new Date(record.date);
            return recordDate.getMonth() === viewDate.getMonth() && 
                   recordDate.getFullYear() === viewDate.getFullYear();
        });
    }, [attendanceRecords, viewDate]);

    const attendanceRate = useMemo(() => {
        const total = stats.present + stats.absent + stats.late + stats.excused;
        if (total === 0) return 0;
        // Present and Late count towards attendance, Absent doesn't. Excused is neutral or counts? 
        // Typically Late counts as present but maybe penalized. Let's count Present + Late + Excused as "Attended" for the rate visual.
        return Math.round(((stats.present + stats.late + stats.excused) / total) * 100);
    }, [stats]);

    const handlePrevMonth = () => {
        const newDate = new Date(viewDate);
        newDate.setMonth(newDate.getMonth() - 1);
        setViewDate(newDate);
    };

    const handleNextMonth = () => {
        const newDate = new Date(viewDate);
        newDate.setMonth(newDate.getMonth() + 1);
        setViewDate(newDate);
    };

    const formatDateDay = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'UTC' });
    };

    const formatDateWeekday = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
    };

    const getStatusStyles = (status: string) => {
        switch(status) {
            case 'Present': return {
                bg: 'bg-emerald-100 dark:bg-emerald-500/20',
                text: 'text-emerald-700 dark:text-emerald-300',
                border: 'border-emerald-200 dark:border-emerald-500/30',
                icon: <CheckCircleIcon className="h-4 w-4" />
            };
            case 'Absent': return {
                bg: 'bg-rose-100 dark:bg-rose-500/20',
                text: 'text-rose-700 dark:text-rose-300',
                border: 'border-rose-200 dark:border-rose-500/30',
                icon: <XIcon className="h-4 w-4" />
            };
            case 'Late': return {
                bg: 'bg-amber-100 dark:bg-amber-500/20',
                text: 'text-amber-700 dark:text-amber-300',
                border: 'border-amber-200 dark:border-amber-500/30',
                icon: <ClockIcon className="h-4 w-4" />
            };
            case 'Excused': return {
                bg: 'bg-blue-100 dark:bg-blue-500/20',
                text: 'text-blue-700 dark:text-blue-300',
                border: 'border-blue-200 dark:border-blue-500/30',
                icon: <InformationCircleIcon className="h-4 w-4" />
            };
            default: return {
                bg: 'bg-gray-100',
                text: 'text-gray-700',
                border: 'border-gray-200',
                icon: null
            };
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Spinner className="h-8 w-8 text-blue-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 m-4 rounded-r-lg" role="alert">
                <p className="font-bold">Error</p>
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-4 px-4 sm:px-0">
                <div>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                        <AttendanceIcon className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                        My Attendance
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">Track your daily class presence.</p>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 px-2 sm:px-0">
                {/* Rate Card */}
                <div className="md:col-span-2 lg:col-span-1 bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-center items-center relative overflow-hidden">
                    <div className="relative z-10 text-center">
                        <span className="text-4xl font-black text-gray-900 dark:text-white">{attendanceRate}%</span>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider mt-1">Attendance Rate</p>
                    </div>
                    <div className="absolute bottom-0 left-0 w-full h-1.5 bg-gray-100 dark:bg-gray-700">
                        <div 
                            className={`h-full transition-all duration-1000 ${attendanceRate >= 80 ? 'bg-emerald-500' : attendanceRate >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} 
                            style={{ width: `${attendanceRate}%` }}
                        ></div>
                    </div>
                </div>

                {/* Stat Cards */}
                <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30 rounded-2xl p-5 flex flex-col items-center justify-center">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-800/30 rounded-full text-emerald-600 dark:text-emerald-400 mb-2">
                        <CheckCircleIcon className="h-6 w-6" />
                    </div>
                    <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{stats.present}</span>
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Present</span>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-2xl p-5 flex flex-col items-center justify-center">
                    <div className="p-2 bg-amber-100 dark:bg-amber-800/30 rounded-full text-amber-600 dark:text-amber-400 mb-2">
                        <ClockIcon className="h-6 w-6" />
                    </div>
                    <span className="text-2xl font-bold text-amber-700 dark:text-amber-300">{stats.late}</span>
                    <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Late</span>
                </div>

                <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800/30 rounded-2xl p-5 flex flex-col items-center justify-center">
                    <div className="p-2 bg-rose-100 dark:bg-rose-800/30 rounded-full text-rose-600 dark:text-rose-400 mb-2">
                        <XIcon className="h-6 w-6" />
                    </div>
                    <span className="text-2xl font-bold text-rose-700 dark:text-rose-300">{stats.absent}</span>
                    <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Absent</span>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 rounded-2xl p-5 flex flex-col items-center justify-center">
                    <div className="p-2 bg-blue-100 dark:bg-blue-800/30 rounded-full text-blue-600 dark:text-blue-400 mb-2">
                        <InformationCircleIcon className="h-6 w-6" />
                    </div>
                    <span className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.excused}</span>
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Excused</span>
                </div>
            </div>

            {/* List Section */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Month Navigator */}
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50 backdrop-blur-xl sticky top-0 z-10">
                    <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors">
                        <ChevronLeftIcon className="h-5 w-5" />
                    </button>
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <CalendarIcon className="h-5 w-5 text-blue-500" />
                        {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </h2>
                    <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors">
                        <ChevronRightIcon className="h-5 w-5" />
                    </button>
                </div>

                {/* Records List */}
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {filteredRecords.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400">
                            <div className="bg-gray-50 dark:bg-gray-700/50 h-20 w-20 rounded-full flex items-center justify-center mb-4">
                                <CalendarIcon className="h-10 w-10 text-gray-300 dark:text-gray-500" />
                            </div>
                            <p className="font-medium">No records for this month.</p>
                        </div>
                    ) : (
                        filteredRecords.map((record) => {
                            const styles = getStatusStyles(record.status);
                            
                            return (
                                <div key={record.id} className="p-4 sm:p-5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className="flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-xl w-14 h-14 shrink-0 border border-gray-200 dark:border-gray-600">
                                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">{formatDateWeekday(record.date)}</span>
                                            <span className="text-xl font-bold text-gray-900 dark:text-white">{formatDateDay(record.date)}</span>
                                        </div>
                                        <div>
                                            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${styles.bg} ${styles.text} ${styles.border} mb-1`}>
                                                <span className="mr-1.5">{styles.icon}</span>
                                                {record.status}
                                            </div>
                                            <p className="text-xs text-gray-400 dark:text-gray-500">
                                                Marked at {record.timestamp?.toDate 
                                                    ? record.timestamp.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
                                                    : 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {/* Optional: Add more details or actions here if needed */}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default AttendancePage;
