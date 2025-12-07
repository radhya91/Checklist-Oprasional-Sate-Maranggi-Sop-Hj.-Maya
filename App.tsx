import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle, 
  Sun, 
  Moon, 
  Coffee, 
  ClipboardList, 
  Trash2, 
  AlertCircle,
  FileText,
  Sparkles,
  Download,
  Loader,
  Store,
  Calendar,
  Clock,
  MapPin,
  Archive,
  Save,
  RotateCcw,
  Folder,
  X,
  ChevronRight,
  ListChecks,
  Filter,
  FileArchive
} from 'lucide-react';
import SignaturePad from './components/SignaturePad';
import PhotoUpload from './components/PhotoUpload';
import { generatePDF, generatePDFBlob, loadZipLibrary } from './services/pdfService';
import { 
  OperationalData, 
  TabType, 
  QcLog, 
  CleaningLog,
  DailyReport
} from './types';

// --- DATA CONSTANTS ---
const LOCATIONS = ["Cimahi 1", "Cimahi 2", "Pasteur"];
const FOLDERS = ["Pagi", "Siang", "Malam"];
const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni", 
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

// --- DATA OPERASIONAL CHECKLIST ---
const OPERATIONAL_DATA: OperationalData = {
  pagi: {
    title: "Shift Pagi (Persiapan)",
    icon: <Coffee className="w-5 h-5" />,
    color: "bg-orange-100 text-orange-700",
    items: [
      { id: 'p1', text: "Berdoa serta briefing staf & pembagian tugas harian" },
      { id: 'p2', text: "Bersihkan area makan, dapur, toilet, wastafel, dan peralatan makan" },
      { id: 'p3', text: "Cek stok bahan baku, lakukan FIFO (First In First Out)" },
      { id: 'p4', text: "Periksa kualitas bahan segar (sayur, daging, ikan, bumbu)" },
      { id: 'p5', text: "Siapkan peralatan dapur & alat saji dalam kondisi bersih dan siap pakai" },
      { id: 'p6', text: "Pastikan kompor, gas, kulkas, freezer, dan peralatan listrik berfungsi normal" },
      { id: 'p7', text: "Pastikan kebersihan & kerapian seragam staf (APD: apron, masker, sarung tangan, penutup kepala)" }
    ]
  },
  siang: {
    title: "Shift Siang (Operasional)",
    icon: <Sun className="w-5 h-5" />,
    color: "bg-blue-100 text-blue-700",
    items: [
      { id: 's1', text: "Laporan stok & cek ketersediaan stok" },
      { id: 's2', text: "Melayani pelanggan sesuai SOP (3S: Senyum, Salam, Sapa)" },
      { id: 's3', text: "Catat pesanan dengan jelas dan ulangi untuk konfirmasi" },
      { id: 's4', text: "Produksi makanan sesuai SOP resep & standar porsi" },
      { id: 's5', text: "Lakukan Test Food (Isi detail di menu Log QC)" },
      { id: 's6', text: "Sajikan makanan sesuai standar (panas/ hangat, rapi, bersih)" },
      { id: 's7', text: "Kontrol kualitas rasa & kebersihan secara berkala" },
      { id: 's8', text: "Catat transaksi berjalan di kasir" },
      { id: 's9', text: "Cek toilet & area makan minimal setiap 2 jam" }
    ]
  },
  malam: {
    title: "Shift Malam (Closing)",
    icon: <Moon className="w-5 h-5" />,
    color: "bg-indigo-100 text-indigo-700",
    items: [
      { id: 'm1', text: "Matikan kompor, gas, listrik, AC, dan alat dapur lain yang tidak dipakai" },
      { id: 'm2', text: "Bersihkan dapur (lantai, meja, kompor, peralatan masak), area makan, dan toilet" },
      { id: 'm3', text: "Simpan bahan sesuai kategori: dingin (chiller), beku (freezer), kering (rak)" },
      { id: 'm4', text: "Catat sisa stok bahan & input ke laporan harian" },
      { id: 'm5', text: "Rekap transaksi penjualan harian (kasir)" },
      { id: 'm6', text: "Buat laporan harian (penjualan, stok, komplain, test food)" },
      { id: 'm7', text: "Pastikan pintu, jendela, dan akses masuk terkunci & aman" },
      { id: 'm8', text: "Lakukan serah terima catatan untuk shift esok hari" }
    ]
  }
};

const CLEANING_SHIFTS = [
  "Pagi (08.15 - 09.00)",
  "Siang-Sore (14.30 - 17.00)",
  "Malam (20.30 - 21.00)"
];

const QC_SHIFTS = [
  "Pagi", "Siang", "Malam"
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('pagi');
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [currentDate, setCurrentDate] = useState("");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const reportRef = useRef<HTMLDivElement>(null);
  
  // History State
  const [history, setHistory] = useState<DailyReport[]>([]);
  const [previewReport, setPreviewReport] = useState<DailyReport | null>(null);

  // Filter State
  const [filterMonth, setFilterMonth] = useState<number>(new Date().getMonth());
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());

  // Save Modal State
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveLocation, setSaveLocation] = useState(LOCATIONS[0]);
  const [saveFolder, setSaveFolder] = useState(FOLDERS[0]);

  // State: Log QC
  const [qcLog, setQcLog] = useState<QcLog>({
    branchName: "", 
    reportDate: "", 
    shift: "",      
    menuName: "",
    taste: "",
    texture: "",
    plating: "",
    notes: "",
    chefSignature: null,
    supervisorSignature: null
  });

  // State: Laporan Kebersihan
  const [cleaningLog, setCleaningLog] = useState<CleaningLog>({
    area: "",
    reportDate: "",
    shift: "",
    timeBefore: "",
    timeAfter: "",
    description: "",
    photosBefore: [],
    photosAfter: [],
    supervisorSignature: null
  });

  // Load Data
  useEffect(() => {
    const savedChecks = localStorage.getItem('restoOps_checks');
    const savedQcLog = localStorage.getItem('restoOps_qcLog');
    const savedCleaning = localStorage.getItem('restoOps_cleaning');
    const savedDate = localStorage.getItem('restoOps_date');
    const savedHistory = localStorage.getItem('restoOps_history');
    
    const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const todayISO = new Date().toISOString().split('T')[0];
    
    setCurrentDate(today);

    // Initial date set for form
    if (cleaningLog.reportDate === "") {
        setCleaningLog(prev => ({...prev, reportDate: todayISO}));
    }
    if (qcLog.reportDate === "") {
        setQcLog(prev => ({...prev, reportDate: todayISO}));
    }

    if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
    }

    // Reset logic if new day
    if (savedDate !== today) {
      localStorage.setItem('restoOps_date', today);
      setCheckedItems({});
      setQcLog({
        branchName: "", reportDate: todayISO, shift: "",
        menuName: "", taste: "", texture: "", plating: "", notes: "", 
        chefSignature: null, supervisorSignature: null
      });
      setCleaningLog({
        area: "", reportDate: todayISO, shift: "", timeBefore: "", timeAfter: "", description: "",
        photosBefore: [], photosAfter: [], supervisorSignature: null
      });
    } else {
      if (savedChecks) setCheckedItems(JSON.parse(savedChecks));
      if (savedQcLog) setQcLog(JSON.parse(savedQcLog));
      if (savedCleaning) setCleaningLog(JSON.parse(savedCleaning));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save Effects
  useEffect(() => { localStorage.setItem('restoOps_checks', JSON.stringify(checkedItems)); }, [checkedItems]);
  useEffect(() => { localStorage.setItem('restoOps_qcLog', JSON.stringify(qcLog)); }, [qcLog]);
  useEffect(() => { localStorage.setItem('restoOps_cleaning', JSON.stringify(cleaningLog)); }, [cleaningLog]);
  useEffect(() => { localStorage.setItem('restoOps_history', JSON.stringify(history)); }, [history]);

  const toggleCheck = (id: string) => {
    setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleQcChange = (field: keyof QcLog, value: any) => {
    setQcLog(prev => ({ ...prev, [field]: value }));
  };

  const handleCleaningChange = (field: keyof CleaningLog, value: any) => {
    setCleaningLog(prev => ({ ...prev, [field]: value }));
  };

  const calculateProgress = (shiftKey: TabType) => {
    if (shiftKey === 'log_qc' || shiftKey === 'cleaning_log' || shiftKey === 'riwayat') return 0;
    const items = OPERATIONAL_DATA[shiftKey].items;
    const total = items.length;
    const completed = items.filter(i => checkedItems[i.id]).length;
    return Math.round((completed / total) * 100);
  };

  // --- SAVE HISTORY LOGIC ---
  const openSaveModal = () => {
      setIsSaveModalOpen(true);
  };

  const handleConfirmSave = () => {
    const todayISO = new Date().toISOString().split('T')[0];
    const timestamp = Date.now();
    const reportId = `${todayISO}-${timestamp}`; 

    const newReport: DailyReport = {
        id: reportId,
        dateFormatted: currentDate,
        checks: checkedItems,
        qc: qcLog,
        cleaning: cleaningLog,
        timestamp: timestamp,
        archiveLocation: saveLocation,
        archiveFolder: saveFolder
    };

    const newHistory = [newReport, ...history];
    setHistory(newHistory);
    
    setIsSaveModalOpen(false);
    alert(`Laporan berhasil disimpan di folder: ${saveLocation} / ${saveFolder}`);
  };

  const deleteHistory = (id: string) => {
    if (confirm("Hapus laporan ini permanen?")) {
        setHistory(prev => prev.filter(h => h.id !== id));
    }
  };

  // --- PDF LOGIC ---
  const handleDownloadPDF = async (reportToPrint: DailyReport | null = null) => {
    if (!reportRef.current) return;
    
    if (reportToPrint) {
        setPreviewReport(reportToPrint);
        setTimeout(async () => {
            const filename = `Laporan_${reportToPrint.archiveLocation}_${reportToPrint.archiveFolder}_${reportToPrint.id}.pdf`;
            await executePdfGeneration(filename);
            setPreviewReport(null);
        }, 100);
    } else {
        await executePdfGeneration(`Laporan_Harian_${new Date().toISOString().split('T')[0]}.pdf`);
    }
  };

  const executePdfGeneration = async (fileName: string) => {
      try {
        setIsGeneratingPDF(true);
        await generatePDF(reportRef.current!, fileName);
      } catch (error) {
        console.error("PDF Generation Error:", error);
        alert("Gagal membuat PDF. Silakan coba lagi.");
      } finally {
        setIsGeneratingPDF(false);
      }
  }

  // --- BULK ZIP LOGIC ---
  const handleBulkDownload = async (reports: DailyReport[]) => {
    if (!reportRef.current) return;
    if (reports.length === 0) {
        alert("Tidak ada laporan untuk diunduh.");
        return;
    }

    try {
        setIsGeneratingPDF(true);
        setBulkProgress({ current: 0, total: reports.length });
        
        await loadZipLibrary();
        // @ts-ignore
        const JSZip = window.JSZip;
        const zip = new JSZip();
        // @ts-ignore
        const saveAs = window.saveAs;

        const folderName = `Arsip_Laporan_${MONTHS[filterMonth]}_${filterYear}`;
        const mainFolder = zip.folder(folderName);

        for (let i = 0; i < reports.length; i++) {
            const report = reports[i];
            setBulkProgress({ current: i + 1, total: reports.length });
            
            // Set Preview
            setPreviewReport(report);
            
            // Wait for DOM update
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Generate Blob
            const pdfBlob = await generatePDFBlob(reportRef.current);
            
            // Clean filename
            const filename = `${report.dateFormatted.replace(/ /g, '_')}_${report.archiveLocation}_${report.archiveFolder}_${report.id}.pdf`;
            
            mainFolder.file(filename, pdfBlob);
        }

        // Generate Zip
        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, `${folderName}.zip`);

    } catch (error) {
        console.error("Bulk Zip Error:", error);
        alert("Gagal membuat ZIP. Coba download satu per satu.");
    } finally {
        setIsGeneratingPDF(false);
        setPreviewReport(null);
        setBulkProgress({ current: 0, total: 0 });
    }
  };

  const resetAll = () => {
    if (confirm("Reset data form hari ini (Checklist, QC & Kebersihan)? Data di Riwayat tidak akan hilang.")) {
      setCheckedItems({});
      const todayISO = new Date().toISOString().split('T')[0];
      setQcLog({
        branchName: "", reportDate: todayISO, shift: "",
        menuName: "", taste: "", texture: "", plating: "", notes: "", 
        chefSignature: null, supervisorSignature: null
      });
      setCleaningLog(prev => ({
          ...prev, 
          area: "", shift: "", timeBefore: "", timeAfter: "", description: "",
          photosBefore: [], photosAfter: [], supervisorSignature: null
      }));
    }
  };

  const renderProgressBar = (shiftKey: TabType) => {
    if (shiftKey === 'log_qc' || shiftKey === 'cleaning_log' || shiftKey === 'riwayat') return null;
    const progress = calculateProgress(shiftKey);
    let colorClass = "bg-gray-200";
    if (progress === 100) colorClass = "bg-green-500";
    else if (progress > 50) colorClass = "bg-blue-500";
    else if (progress > 0) colorClass = "bg-orange-400";

    return (
      <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
        <div className={`h-2.5 rounded-full transition-all duration-500 ${colorClass}`} style={{ width: `${progress}%` }}></div>
        <div className="text-xs text-right mt-1 text-gray-500">{progress}% Selesai</div>
      </div>
    );
  };

  // --- HELPERS FOR PDF DATA & VISIBILITY ---
  const pdfData = {
      checks: previewReport ? previewReport.checks : checkedItems,
      qc: previewReport ? previewReport.qc : qcLog,
      cleaning: previewReport ? previewReport.cleaning : cleaningLog,
      date: previewReport ? previewReport.dateFormatted : currentDate,
      location: previewReport ? previewReport.archiveLocation : "Laporan Langsung",
      folder: previewReport ? previewReport.archiveFolder : "-"
  };

  const hasChecklistData = (shiftKey: string) => {
      return OPERATIONAL_DATA[shiftKey].items.some(item => pdfData.checks[item.id]);
  };
  const hasQcData = !!pdfData.qc.menuName;
  const hasCleaningData = !!pdfData.cleaning.area;
  const activeOperationalShifts = Object.keys(OPERATIONAL_DATA).filter(key => hasChecklistData(key));
  const isPdfEmpty = activeOperationalShifts.length === 0 && !hasQcData && !hasCleaningData;

  // --- FILTERED HISTORY ---
  const filteredHistory = history.filter(report => {
      const reportDate = new Date(report.timestamp);
      return reportDate.getMonth() === filterMonth && reportDate.getFullYear() === filterYear;
  });

  // --- RENDER CONTENT (SCREEN VIEW) ---
  const renderContent = () => {
    // --- 4. TAB: RIWAYAT ---
    if (activeTab === 'riwayat') {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in">
                <div className="p-5 border-b border-gray-100 bg-slate-100">
                    <h2 className="text-xl font-bold flex items-center text-slate-800">
                        <Archive className="mr-2 w-6 h-6" />
                        Arsip Laporan
                    </h2>
                    <p className="text-xs text-slate-600 mt-1">
                        Download laporan bulanan atau tahunan dalam format ZIP.
                    </p>
                </div>
                
                <div className="p-4">
                    {/* FILTERS */}
                    <div className="flex flex-col md:flex-row gap-4 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <div className="flex-1">
                            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Bulan</label>
                            <select 
                                value={filterMonth} 
                                onChange={(e) => setFilterMonth(Number(e.target.value))}
                                className="w-full p-2 rounded-lg border border-gray-300 bg-white"
                            >
                                {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                            </select>
                        </div>
                        <div className="flex-1">
                             <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Tahun</label>
                             <select 
                                value={filterYear} 
                                onChange={(e) => setFilterYear(Number(e.target.value))}
                                className="w-full p-2 rounded-lg border border-gray-300 bg-white"
                            >
                                {[0, 1, 2].map(i => {
                                    const y = new Date().getFullYear() - i;
                                    return <option key={y} value={y}>{y}</option>
                                })}
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button 
                                onClick={() => handleBulkDownload(filteredHistory)}
                                disabled={isGeneratingPDF || filteredHistory.length === 0}
                                className={`w-full md:w-auto px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 shadow-sm transition-colors ${
                                    filteredHistory.length === 0 
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                }`}
                            >
                                {isGeneratingPDF && bulkProgress.total > 0 ? (
                                    <><Loader className="w-4 h-4 animate-spin" /> {bulkProgress.current}/{bulkProgress.total}</>
                                ) : (
                                    <><FileArchive className="w-4 h-4" /> Download ZIP ({filteredHistory.length})</>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* LIST */}
                    {filteredHistory.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                            <Filter className="w-12 h-12 mx-auto mb-2 opacity-20" />
                            <p>Tidak ada laporan ditemukan pada periode {MONTHS[filterMonth]} {filterYear}.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredHistory.map((report) => {
                                // Determine active sections
                                const activeChecks = Object.keys(OPERATIONAL_DATA).filter(key => 
                                    OPERATIONAL_DATA[key].items.some(item => report.checks[item.id])
                                );
                                const hasQC = !!report.qc.menuName;
                                const hasClean = !!report.cleaning.area;

                                return (
                                <div key={report.id} className="border border-gray-200 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center hover:bg-gray-50 transition-colors shadow-sm animate-fade-in">
                                    <div className="mb-3 md:mb-0 w-full">
                                        <div className="flex items-center text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">
                                             <Folder className="w-3 h-3 mr-1" />
                                             {report.archiveLocation || "Umum"} 
                                             <ChevronRight className="w-3 h-3 mx-1" />
                                             {report.archiveFolder || "Umum"}
                                        </div>
                                        <div className="font-bold text-gray-800 flex items-center gap-2 text-lg">
                                            {report.dateFormatted}
                                        </div>
                                        
                                        <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-2">
                                            {activeChecks.map(shift => (
                                                <span key={shift} className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded border border-orange-100 capitalize flex items-center gap-1">
                                                    <ListChecks className="w-3 h-3" /> {shift}
                                                </span>
                                            ))}
                                            {hasQC && (
                                                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 flex items-center gap-1">
                                                    <FileText className="w-3 h-3" /> QC: {report.qc.menuName}
                                                </span>
                                            )}
                                            {hasClean && (
                                                <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-100 flex items-center gap-1">
                                                    <Sparkles className="w-3 h-3" /> Clean: {report.cleaning.area}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                                        <button 
                                            onClick={() => handleDownloadPDF(report)}
                                            className="flex-1 md:flex-none px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 flex items-center justify-center gap-2 shadow-sm"
                                            disabled={isGeneratingPDF}
                                        >
                                            {isGeneratingPDF && !bulkProgress.total ? <Loader className="w-4 h-4 animate-spin"/> : <Download className="w-4 h-4" />}
                                            PDF
                                        </button>
                                        <button 
                                            onClick={() => deleteHistory(report.id)}
                                            className="px-3 py-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                            title="Hapus Arsip"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // --- 1. TAB: LAPORAN KEBERSIHAN ---
    if (activeTab === 'cleaning_log') {
        const isComplete = cleaningLog.area && cleaningLog.reportDate && cleaningLog.shift && 
                           cleaningLog.timeBefore && cleaningLog.timeAfter && cleaningLog.description && 
                           cleaningLog.supervisorSignature;

        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in">
                <div className="p-5 border-b border-gray-100 bg-purple-50">
                    <h2 className="text-xl font-bold flex items-center text-purple-800">
                        <Sparkles className="mr-2 w-6 h-6" />
                        Laporan Kebersihan Harian Gerai
                    </h2>
                    <p className="text-xs text-purple-600 mt-1">
                        Dokumentasi kebersihan sebelum & sesudah operasional
                    </p>
                </div>

                <div className="p-6 space-y-6">
                    {/* General Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1"><MapPin className="w-3 h-3"/> 1. Area Pelaporan</label>
                            <input 
                                type="text"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                placeholder="Cth: Dapur Utama, Area Dine-in..."
                                value={cleaningLog.area}
                                onChange={(e) => handleCleaningChange('area', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3"/> 2. Tanggal Pelaporan</label>
                            <input 
                                type="date"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                value={cleaningLog.reportDate}
                                onChange={(e) => handleCleaningChange('reportDate', e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Time & Shift */}
                    <div>
                         <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1"><Clock className="w-3 h-3"/> 3. Waktu / Shift Pelaporan</label>
                         <select 
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white"
                            value={cleaningLog.shift}
                            onChange={(e) => handleCleaningChange('shift', e.target.value)}
                         >
                            <option value="">-- Pilih Shift Kebersihan --</option>
                            {CLEANING_SHIFTS.map((shift, idx) => (
                                <option key={idx} value={shift}>{shift}</option>
                            ))}
                         </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">4a. Jam Foto Sebelum</label>
                             <input 
                                type="time"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                value={cleaningLog.timeBefore}
                                onChange={(e) => handleCleaningChange('timeBefore', e.target.value)}
                             />
                        </div>
                        <div>
                             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">4b. Jam Foto Sesudah</label>
                             <input 
                                type="time"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                                value={cleaningLog.timeAfter}
                                onChange={(e) => handleCleaningChange('timeAfter', e.target.value)}
                             />
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">5. Deskripsi Pembersihan</label>
                        <textarea 
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                            placeholder="Jelaskan detail aktivitas pembersihan yang dilakukan..."
                            value={cleaningLog.description}
                            onChange={(e) => handleCleaningChange('description', e.target.value)}
                        />
                    </div>

                    {/* Photo Uploads */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-gray-100">
                        <PhotoUpload 
                            label="6. Foto SEBELUM (Max 10)"
                            photos={cleaningLog.photosBefore}
                            onUpload={(files) => handleCleaningChange('photosBefore', files)}
                            onRemove={(idx) => {
                                const newPhotos = [...cleaningLog.photosBefore];
                                newPhotos.splice(idx, 1);
                                handleCleaningChange('photosBefore', newPhotos);
                            }}
                        />
                        <PhotoUpload 
                            label="7. Foto SESUDAH (Max 10)"
                            photos={cleaningLog.photosAfter}
                            onUpload={(files) => handleCleaningChange('photosAfter', files)}
                            onRemove={(idx) => {
                                const newPhotos = [...cleaningLog.photosAfter];
                                newPhotos.splice(idx, 1);
                                handleCleaningChange('photosAfter', newPhotos);
                            }}
                        />
                    </div>

                    {/* Signature */}
                    <div className="pt-4 border-t border-gray-200">
                         <SignaturePad 
                            label="8. Tanda Tangan Supervisor" 
                            savedImage={cleaningLog.supervisorSignature}
                            onSave={(img) => handleCleaningChange('supervisorSignature', img)}
                            onClear={() => handleCleaningChange('supervisorSignature', null)}
                        />
                    </div>

                     {/* Status Footer */}
                     <div className={`p-4 rounded-lg flex items-center justify-center space-x-2 ${isComplete ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-500'}`}>
                        {isComplete ? (
                            <>
                                <CheckCircle className="w-6 h-6" />
                                <span className="font-bold">Laporan Kebersihan Siap Disimpan</span>
                            </>
                        ) : (
                            <>
                                <AlertCircle className="w-6 h-6" />
                                <span className="font-semibold">Mohon lengkapi laporan & tanda tangan</span>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // --- 2. TAB: LOG QC (EXISTING) ---
    if (activeTab === 'log_qc') {
        const isComplete = qcLog.branchName && qcLog.reportDate && qcLog.shift && qcLog.menuName && qcLog.taste && qcLog.texture && qcLog.plating && qcLog.chefSignature && qcLog.supervisorSignature;

        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in">
                <div className="p-5 border-b border-gray-100 bg-teal-50">
                    <h2 className="text-xl font-bold flex items-center text-teal-800">
                        <FileText className="mr-2 w-6 h-6" />
                        Log Test Food Harian
                    </h2>
                    <p className="text-xs text-teal-600 mt-1">
                        Formulir Wajib Quality Control (QC)
                    </p>
                </div>
                
                <div className="p-6 space-y-6">
                    {/* General Info (NEW FIELDS) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1"><Store className="w-3 h-3"/> Cabang Gerai</label>
                            <input 
                                type="text"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                placeholder="Nama Cabang..."
                                value={qcLog.branchName}
                                onChange={(e) => handleQcChange('branchName', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3"/> Tanggal</label>
                            <input 
                                type="date"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                value={qcLog.reportDate}
                                onChange={(e) => handleQcChange('reportDate', e.target.value)}
                            />
                        </div>
                        <div>
                             <label className="block text-sm font-semibold text-gray-700 mb-1 flex items-center gap-1"><Clock className="w-3 h-3"/> Shift</label>
                             <select 
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white"
                                value={qcLog.shift}
                                onChange={(e) => handleQcChange('shift', e.target.value)}
                             >
                                <option value="">-- Pilih Shift --</option>
                                {QC_SHIFTS.map((shift, idx) => (
                                    <option key={idx} value={shift}>{shift}</option>
                                ))}
                             </select>
                        </div>
                    </div>

                    {/* Input Text Section */}
                    <div className="grid grid-cols-1 gap-5 pt-4 border-t border-gray-100">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">1. Nama Menu</label>
                            <input 
                                type="text"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                placeholder="Contoh: Rendang Sapi Spesial"
                                value={qcLog.menuName}
                                onChange={(e) => handleQcChange('menuName', e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">2. Rasa</label>
                                <textarea 
                                    rows={2}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                    placeholder="Deskripsi rasa (asin, manis, pedas)..."
                                    value={qcLog.taste}
                                    onChange={(e) => handleQcChange('taste', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">3. Tekstur</label>
                                <textarea 
                                    rows={2}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                    placeholder="Deskripsi tekstur (empuk, alot, krispi)..."
                                    value={qcLog.texture}
                                    onChange={(e) => handleQcChange('texture', e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">4. Tampilan / Plating</label>
                            <input 
                                type="text"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                                placeholder="Apakah visual sesuai standar foto menu?"
                                value={qcLog.plating}
                                onChange={(e) => handleQcChange('plating', e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-red-600 mb-1">5. Catatan / Perbaikan (Opsional)</label>
                            <input 
                                type="text"
                                className="w-full px-4 py-2 border border-red-200 bg-red-50 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none placeholder-red-300"
                                placeholder="Tindakan koreksi jika ada..."
                                value={qcLog.notes}
                                onChange={(e) => handleQcChange('notes', e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Signature Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200">
                        <SignaturePad 
                            label="6. Tanda Tangan Chef" 
                            savedImage={qcLog.chefSignature}
                            onSave={(img) => handleQcChange('chefSignature', img)}
                            onClear={() => handleQcChange('chefSignature', null)}
                        />
                        <SignaturePad 
                            label="7. Tanda Tangan Supervisor" 
                            savedImage={qcLog.supervisorSignature}
                            onSave={(img) => handleQcChange('supervisorSignature', img)}
                            onClear={() => handleQcChange('supervisorSignature', null)}
                        />
                    </div>

                    {/* Status Footer */}
                    <div className={`p-4 rounded-lg flex items-center justify-center space-x-2 ${isComplete ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                        {isComplete ? (
                            <>
                                <CheckCircle className="w-6 h-6" />
                                <span className="font-bold">Dokumen QC Lengkap & Valid</span>
                            </>
                        ) : (
                            <>
                                <AlertCircle className="w-6 h-6" />
                                <span className="font-semibold">Mohon lengkapi semua data & tanda tangan</span>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // --- 3. RENDER CHECKLIST BIASA (Pagi, Siang, Malam) ---
    // At this point activeTab is guaranteed to be one of the operational keys
    const operationalKey = activeTab as keyof typeof OPERATIONAL_DATA;
    const currentShift = OPERATIONAL_DATA[operationalKey];

    if (currentShift) {
      return (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in">
              <div className="p-5 border-b border-gray-100 bg-gray-50">
              <h2 className="text-xl font-bold flex items-center text-gray-800">
                  <ClipboardList className="mr-2 w-6 h-6 text-gray-600" />
                  {currentShift.title}
              </h2>
              {renderProgressBar(activeTab)}
              </div>

              <div className="divide-y divide-gray-100">
              {currentShift.items.map((item) => {
                  const isChecked = !!checkedItems[item.id];
                  return (
                  <label 
                      key={item.id} 
                      className={`flex items-start p-4 cursor-pointer transition-all duration-200 hover:bg-gray-50 ${isChecked ? 'bg-gray-50' : 'bg-white'}`}
                  >
                      <div className="relative flex items-center mt-1 mr-4">
                      <input 
                          type="checkbox" 
                          className="peer sr-only"
                          checked={isChecked}
                          onChange={() => toggleCheck(item.id)}
                      />
                      <div className={`w-6 h-6 border-2 rounded-full transition-all duration-200 flex items-center justify-center
                          ${isChecked 
                          ? 'bg-green-500 border-green-500' 
                          : 'bg-white border-gray-300 peer-hover:border-green-400'
                          }`}
                      >
                          <CheckCircle className={`w-4 h-4 text-white transition-opacity duration-200 ${isChecked ? 'opacity-100' : 'opacity-0'}`} />
                      </div>
                      </div>
                      <div className="flex-1">
                      <span className={`text-lg transition-all duration-200 ${isChecked ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                          {item.text}
                      </span>
                      </div>
                  </label>
                  );
              })}
              </div>
          </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-gray-800 pb-10">
      
      {/* SAVE MODAL */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all scale-100">
                <div className="p-6 border-b border-gray-100 bg-slate-50 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">Simpan Laporan</h3>
                        <p className="text-xs text-gray-500">Pilih lokasi folder penyimpanan arsip</p>
                    </div>
                    <button onClick={() => setIsSaveModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">1. Lokasi Cabang</label>
                        <div className="grid grid-cols-1 gap-2">
                            {LOCATIONS.map(loc => (
                                <button
                                    key={loc}
                                    onClick={() => setSaveLocation(loc)}
                                    className={`flex items-center p-3 rounded-lg border transition-all ${
                                        saveLocation === loc 
                                        ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold ring-1 ring-blue-500' 
                                        : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                                    }`}
                                >
                                    <Store className={`w-4 h-4 mr-3 ${saveLocation === loc ? 'text-blue-500' : 'text-gray-400'}`} />
                                    {loc}
                                    {saveLocation === loc && <CheckCircle className="w-4 h-4 ml-auto text-blue-500" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">2. Folder Shift</label>
                        <div className="flex gap-2">
                            {FOLDERS.map(folder => (
                                <button
                                    key={folder}
                                    onClick={() => setSaveFolder(folder)}
                                    className={`flex-1 py-2 px-3 rounded-lg border text-sm transition-all text-center ${
                                        saveFolder === folder
                                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-bold ring-1 ring-indigo-500' 
                                        : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                                    }`}
                                >
                                    {folder}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                    <button 
                        onClick={() => setIsSaveModalOpen(false)}
                        className="flex-1 py-2.5 px-4 rounded-xl text-gray-500 font-semibold hover:bg-gray-100 transition-colors"
                    >
                        Batal
                    </button>
                    <button 
                        onClick={handleConfirmSave}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-green-600 text-white font-bold shadow-md hover:bg-green-700 transition-transform active:scale-95 flex items-center justify-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        Konfirmasi Simpan
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* HEADER UTAMA */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center space-x-2">
              <img 
                src="https://placehold.co/40x40/1e40af/ffffff?text=RE" 
                alt="Logo Restoran" 
                className="w-8 h-8 rounded-lg shadow-md object-cover" 
                onError={(e) => { 
                    const target = e.target as HTMLImageElement;
                    target.onerror = null; 
                    target.src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='none' stroke='%231e40af' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'></path><polyline points='9 22 9 12 15 12 15 22'></polyline></svg>"
                }}
              />
              <div>
                <h1 className="text-lg font-bold text-gray-900 leading-tight">Checklist Oprasional</h1>
                <p className="text-xs text-gray-500 font-medium">Management Hj. Maya</p>
              </div>
            </div>
            <div className="flex space-x-1 md:space-x-2">
                <button 
                    onClick={openSaveModal}
                    className="p-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg transition-colors flex items-center gap-1"
                    title="Simpan Laporan Hari Ini ke Riwayat"
                >
                    <Save className="w-5 h-5" />
                    <span className="text-xs font-semibold hidden md:inline">Simpan</span>
                </button>
                <button 
                    onClick={() => handleDownloadPDF(null)}
                    disabled={isGeneratingPDF}
                    className={`p-2 rounded-lg transition-colors flex items-center gap-1 ${isGeneratingPDF ? 'bg-gray-100 text-gray-400' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                    title="Download / Cetak PDF Hari Ini"
                >
                    {isGeneratingPDF ? <Loader className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                    <span className="text-xs font-semibold hidden md:inline">PDF</span>
                </button>
                <button 
                    onClick={resetAll}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="Reset Form Hari Ini"
                >
                    <RotateCcw className="w-5 h-5" />
                </button>
            </div>
          </div>
          <div className="bg-slate-100 rounded-lg p-2 text-center text-sm font-semibold text-slate-700">
            {currentDate}
          </div>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        
        {/* Navigation Tabs */}
        <div className="flex space-x-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          {Object.keys(OPERATIONAL_DATA).map((key) => {
            const isActive = activeTab === key;
            const data = OPERATIONAL_DATA[key];
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key as TabType)}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl border transition-all duration-200 whitespace-nowrap ${
                  isActive 
                    ? `${data.color} border-transparent shadow-md ring-2 ring-offset-1 ring-opacity-50 ring-gray-300` 
                    : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                }`}
              >
                {data.icon}
                <span className="font-semibold capitalize">{key}</span>
              </button>
            );
          })}
          
          <button
            onClick={() => setActiveTab('log_qc')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl border transition-all duration-200 whitespace-nowrap ${
                activeTab === 'log_qc'
                ? "bg-teal-100 text-teal-700 border-transparent shadow-md ring-2 ring-offset-1 ring-opacity-50 ring-gray-300"
                : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
            }`}
          >
            <FileText className="w-5 h-5" />
            <span className="font-semibold capitalize">Log QC</span>
          </button>

          <button
            onClick={() => setActiveTab('cleaning_log')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl border transition-all duration-200 whitespace-nowrap ${
                activeTab === 'cleaning_log'
                ? "bg-purple-100 text-purple-700 border-transparent shadow-md ring-2 ring-offset-1 ring-opacity-50 ring-gray-300"
                : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
            }`}
          >
            <Sparkles className="w-5 h-5" />
            <span className="font-semibold capitalize">Kebersihan</span>
          </button>

          <button
            onClick={() => setActiveTab('riwayat')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl border transition-all duration-200 whitespace-nowrap ${
                activeTab === 'riwayat'
                ? "bg-slate-200 text-slate-800 border-transparent shadow-md ring-2 ring-offset-1 ring-opacity-50 ring-gray-300"
                : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
            }`}
          >
            <Archive className="w-5 h-5" />
            <span className="font-semibold capitalize">Riwayat</span>
          </button>
        </div>

        {/* Content Render */}
        {renderContent()}

        {/* Footer Info */}
        <div className="mt-8 text-center text-gray-400 text-xs">
          <p>© 2025 RestoOps Enterprise System. Penyimpanan Lokal Browser.</p>
        </div>
      </div>

      {/* ---------------- HIDDEN PRINT / PDF CONTAINER ---------------- */}
      {/* Kontainer ini hanya akan 'terlihat' oleh html2canvas saat proses download */}
      <div 
        ref={reportRef} 
        className={`${isGeneratingPDF ? 'fixed top-0 left-0 z-[9999] bg-white w-[210mm]' : 'hidden'} p-8 font-sans text-gray-800`}
      >
        <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
            <img 
              src="https://placehold.co/40x40/1e40af/ffffff?text=RE" 
              alt="Logo Restoran" 
              className="w-12 h-12 rounded-lg shadow-md mx-auto mb-2 object-cover" 
            />
            <h1 className="text-2xl font-bold uppercase">Laporan Operasional Harian</h1>
            <h2 className="text-xl">Management Hj. Maya</h2>
            <div className="mt-2 text-sm border p-1 inline-block px-3 rounded bg-gray-50">
                <span className="font-bold">{pdfData.location}</span> / <span>{pdfData.folder}</span>
            </div>
            <p className="text-sm mt-1">{pdfData.date}</p>
        </div>
        
        {isPdfEmpty && (
             <div className="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center text-gray-400">
                <p className="italic">Tidak ada data checklist, QC, atau kebersihan yang diisi untuk laporan ini.</p>
             </div>
        )}

        {/* 1. Summary Checklist Operasional (CONDITIONAL) */}
        {activeOperationalShifts.length > 0 && (
        <div className="mb-8">
            <h3 className="font-bold text-lg bg-gray-100 p-2 border-l-4 border-gray-800 mb-4">1. Ringkasan Checklist Operasional</h3>
            <div className="grid grid-cols-1 gap-6">
                {activeOperationalShifts.map(key => (
                    <div key={key} className="border border-gray-200 p-4 rounded text-sm">
                        <h4 className="font-bold capitalize mb-2 border-b pb-1">{OPERATIONAL_DATA[key].title}</h4>
                        <ul className="space-y-1">
                            {OPERATIONAL_DATA[key].items.map(item => (
                                <li key={item.id} className="flex items-start">
                                    <span className="mr-2 font-mono">
                                        {pdfData.checks[item.id] ? '[✓]' : '[ ]'}
                                    </span>
                                    <span>{item.text}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </div>
        )}

        {/* 2. Detail Log QC (CONDITIONAL) */}
        {hasQcData && (
        <div className="mb-8">
            <h3 className="font-bold text-lg bg-teal-100 p-2 border-l-4 border-teal-800 mb-4">2. Detail Log Quality Control (QC)</h3>
            <table className="w-full text-sm border-collapse border border-gray-300">
                <tbody>
                    <tr>
                        <td className="border border-gray-300 p-2 font-bold bg-gray-50 w-1/4">Cabang Gerai</td>
                        <td className="border border-gray-300 p-2">{pdfData.qc.branchName || "-"}</td>
                        <td className="border border-gray-300 p-2 font-bold bg-gray-50 w-1/4">Shift</td>
                        <td className="border border-gray-300 p-2">{pdfData.qc.shift || "-"}</td>
                    </tr>
                    <tr>
                        <td className="border border-gray-300 p-2 font-bold bg-gray-50">Tanggal</td>
                        <td className="border border-gray-300 p-2" colSpan={3}>{pdfData.qc.reportDate || "-"}</td>
                    </tr>
                    <tr>
                        <td className="border border-gray-300 p-2 font-bold bg-gray-50">Nama Menu</td>
                        <td className="border border-gray-300 p-2" colSpan={3}>{pdfData.qc.menuName || "-"}</td>
                    </tr>
                    <tr>
                        <td className="border border-gray-300 p-2 font-bold bg-gray-50">Rasa</td>
                        <td className="border border-gray-300 p-2" colSpan={3}>{pdfData.qc.taste || "-"}</td>
                    </tr>
                    <tr>
                        <td className="border border-gray-300 p-2 font-bold bg-gray-50">Tekstur</td>
                        <td className="border border-gray-300 p-2" colSpan={3}>{pdfData.qc.texture || "-"}</td>
                    </tr>
                    <tr>
                        <td className="border border-gray-300 p-2 font-bold bg-gray-50">Plating</td>
                        <td className="border border-gray-300 p-2" colSpan={3}>{pdfData.qc.plating || "-"}</td>
                    </tr>
                    <tr>
                        <td className="border border-gray-300 p-2 font-bold bg-gray-50">Catatan/Perbaikan</td>
                        <td className="border border-gray-300 p-2 text-red-600" colSpan={3}>{pdfData.qc.notes || "-"}</td>
                    </tr>
                </tbody>
            </table>
            
            <div className="mt-4 flex justify-around text-center">
                <div className="w-40">
                    <p className="text-xs font-bold mb-2">Chef / Juru Masak</p>
                    {pdfData.qc.chefSignature ? (
                        <img src={pdfData.qc.chefSignature} className="h-16 mx-auto border-b border-gray-300" alt="Chef Sig"/>
                    ) : <div className="h-16 border-b border-gray-300"></div>}
                </div>
                <div className="w-40">
                    <p className="text-xs font-bold mb-2">Supervisor</p>
                    {pdfData.qc.supervisorSignature ? (
                        <img src={pdfData.qc.supervisorSignature} className="h-16 mx-auto border-b border-gray-300" alt="SPV Sig"/>
                    ) : <div className="h-16 border-b border-gray-300"></div>}
                </div>
            </div>
        </div>
        )}

        {/* 3. Detail Laporan Kebersihan (CONDITIONAL) */}
        {hasCleaningData && (
        <div className="mb-8">
            <h3 className="font-bold text-lg bg-purple-100 p-2 border-l-4 border-purple-800 mb-4">3. Laporan Kebersihan Gerai</h3>
             <table className="w-full text-sm border-collapse border border-gray-300 mb-4">
                <tbody>
                    <tr>
                        <td className="border border-gray-300 p-2 font-bold bg-gray-50 w-1/4">Area</td>
                        <td className="border border-gray-300 p-2">{pdfData.cleaning.area || "-"}</td>
                        <td className="border border-gray-300 p-2 font-bold bg-gray-50 w-1/4">Waktu Shift</td>
                        <td className="border border-gray-300 p-2">{pdfData.cleaning.shift || "-"}</td>
                    </tr>
                    <tr>
                        <td className="border border-gray-300 p-2 font-bold bg-gray-50">Tanggal</td>
                        <td className="border border-gray-300 p-2">{pdfData.cleaning.reportDate || "-"}</td>
                        <td className="border border-gray-300 p-2 font-bold bg-gray-50">Jam Pengerjaan</td>
                        <td className="border border-gray-300 p-2">{pdfData.cleaning.timeBefore} s/d {pdfData.cleaning.timeAfter}</td>
                    </tr>
                    <tr>
                        <td className="border border-gray-300 p-2 font-bold bg-gray-50">Deskripsi</td>
                        <td className="border border-gray-300 p-2" colSpan={3}>{pdfData.cleaning.description || "-"}</td>
                    </tr>
                </tbody>
            </table>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <h5 className="font-bold text-xs uppercase mb-2">Foto Sebelum (Before):</h5>
                    <div className="flex flex-wrap gap-2">
                        {pdfData.cleaning.photosBefore.length > 0 ? pdfData.cleaning.photosBefore.map((src, i) => (
                            <img key={i} src={src} className="w-24 h-24 object-cover border border-gray-300" alt={`Before ${i}`}/>
                        )) : <span className="text-gray-400 italic text-xs">Tidak ada foto</span>}
                    </div>
                </div>
                <div>
                    <h5 className="font-bold text-xs uppercase mb-2">Foto Sesudah (After):</h5>
                    <div className="flex flex-wrap gap-2">
                        {pdfData.cleaning.photosAfter.length > 0 ? pdfData.cleaning.photosAfter.map((src, i) => (
                            <img key={i} src={src} className="w-24 h-24 object-cover border border-gray-300" alt={`After ${i}`}/>
                        )) : <span className="text-gray-400 italic text-xs">Tidak ada foto</span>}
                    </div>
                </div>
            </div>

            <div className="mt-4 text-right">
                 <div className="inline-block w-40 text-center">
                    <p className="text-xs font-bold mb-2">Disetujui Oleh (SPV)</p>
                    {pdfData.cleaning.supervisorSignature ? (
                        <img src={pdfData.cleaning.supervisorSignature} className="h-16 mx-auto border-b border-gray-300" alt="SPV Clean Sig"/>
                    ) : <div className="h-16 border-b border-gray-300"></div>}
                </div>
            </div>
        </div>
        )}

        <div className="text-center text-xs text-gray-400 mt-8 border-t pt-2">
            Dicetak otomatis oleh Sistem Operasional Rumah Makan - Management Hj. Maya
        </div>
      </div>
    </div>
  );
}