import {
    User, Mail, Home,
    ListChecks,
    CheckCircle2, Lock, Home as HomeIcon, Flame,
    SortDesc, SortAsc, Award,
    Edit2,
    Trash2,
    MoreVertical,
    Clock,
    Calendar,
} from "lucide-react";

// BACKEND TEST 
// DUMMY DATA
const cssConstants = [
    {
        title: "Buy groceries",
        description: "Milk, bread, eggs, and spinach",
        priority: "Low",
        dueDate: "2025-05-02T18:00:00.000Z",
        completed: "No"
    },
    {
        "title": "Book dentist appointment",
        "description": "Routine check-up and cleaning",
        "priority": "Medium",
        "dueDate": "2025-05-10T10:00:00.000Z",
        "completed": true
    },
    {
        "title": "Book dentist appointment",
        "description": "Routine check-up and cleaning",
        "priority": "Medium",
        "dueDate": "2025-05-10T10:00:00.000Z",
        "completed": true
    },
    {
        "title": "Pay utility bills",
        "description": "Electricity and water bills for April",
        "priority": "High",
        "dueDate": "2025-04-28T12:00:00.000Z",
        "completed": "Yes"
    }
];

// FRONTEND DUMMY DATA

// assets/formConstants.js
export const baseControlClasses =
    "w-full px-4 py-2.5 border border-teal-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm sm:text-base text-gray-700 placeholder-gray-400 transition-all duration-200";

export const priorityStyles = {
    Low: "bg-gray-100 text-gray-700 border-gray-200",
    Medium: "bg-orange-100 text-orange-700 border-orange-200",
    High: "bg-yellow-100 text-yellow-700 border-yellow-200",
};

// data/defaultTask.js
export const DEFAULT_TASK = {
    title: "",
    description: "",
    priority: "Low",
    dueDate: "",
    completed: "No",
    id: null,
};

// LOGIN CSS
export const INPUTWRAPPER = 'flex items-center px-3 py-2 border border-teal-200 rounded-lg focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500 bg-white/90 backdrop-blur-sm text-sm gap-2 transition-all duration-200 shadow-sm hover:shadow-md';

export const BUTTON_CLASSES = 'w-full flex items-center justify-center bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed';

// PROFILE CSS
export const INPUT_WRAPPER =
    "flex items-center border border-teal-200 rounded-lg px-3 py-2.5 focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500 transition-all duration-200 bg-teal-50/50";

export const FULL_BUTTON =
    "w-full bg-gradient-to-r from-teal-500 to-emerald-600 text-white py-2.5 rounded-lg hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2 font-semibold text-sm sm:text-base";

export const SECTION_WRAPPER = "bg-white/90 backdrop-blur-sm rounded-2xl shadow-md border border-teal-100 p-6 sm:p-8";

export const BACK_BUTTON =
    "flex items-center text-teal-600 hover:text-emerald-700 font-medium hover:bg-teal-50 rounded-lg px-3 py-2 transition-colors duration-200";

export const DANGER_BTN =
    "w-full text-red-600 border border-red-200 py-2.5 rounded-lg hover:bg-red-50 transition-colors duration-200";

export const personalFields = [
    { name: "name", type: "text", placeholder: "Full Name", icon: User },
    { name: "email", type: "email", placeholder: "Email", icon: Mail },
];

export const securityFields = [
    { name: "current", placeholder: "Current Password" },
    { name: "new", placeholder: "New Password" },
    { name: "confirm", placeholder: "Confirm Password" },
];

// SIDEBAR 
export const menuItems = [
    { text: "Dashboard", path: "/", icon: <Home className="w-5 h-5 text-teal-500" /> },
    { text: "Pending Tasks", path: "/pending", icon: <ListChecks className="w-5 h-5 text-teal-500" /> },
    { text: "Completed Tasks", path: "/complete", icon: <CheckCircle2 className="w-5 h-5 text-teal-500" /> },
];

export const SIDEBAR_CLASSES = {
    desktop: "hidden md:flex flex-col fixed h-full w-20 lg:w-64 bg-white/90 backdrop-blur-md border-r border-teal-100 shadow-md z-20 transition-all duration-300",
    mobileButton: "absolute md:hidden top-25 left-5 z-50 bg-white/90 backdrop-blur-md text-teal-500 p-2 rounded-full shadow-md hover:bg-teal-50 transition-colors duration-200",
    mobileDrawerBackdrop: "fixed inset-0 bg-black/50 backdrop-blur-sm",
    mobileDrawer: "absolute top-0 left-0 w-64 h-full bg-white/90 backdrop-blur-md border-r border-teal-100 shadow-lg z-50 p-4 sm:p-5 flex flex-col space-y-6",
};

export const LINK_CLASSES = {
    base: "group flex items-center px-4 py-3 rounded-xl transition-all duration-300",
    active: "bg-teal-100 border-l-4 border-teal-500 text-teal-700 font-medium shadow-sm",
    inactive: "hover:bg-teal-50/50 text-gray-600 hover:text-teal-700",
    icon: "transition-transform duration-300 group-hover:scale-110 text-teal-500",
    text: "text-sm font-medium ml-2",
};

export const PRODUCTIVITY_CARD = {
    container: "bg-white/90 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-teal-100 shadow-md",
    header: "flex items-center justify-between mb-2",
    label: "text-xs sm:text-sm font-semibold text-gray-800",
    badge: "text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full",
    barBg: "w-full h-2 rounded-full overflow-hidden bg-teal-50",
    barFg: "h-full bg-gradient-to-r from-teal-500 to-emerald-600 transition-all duration-500",
};

export const TIP_CARD = {
    container: "bg-white/90 backdrop-blur-sm rounded-xl p-4 sm:p-5 border border-teal-100 shadow-md",
    iconWrapper: "p-2 bg-teal-50 rounded-lg",
    title: "text-sm font-semibold text-gray-800",
    text: "text-xs sm:text-sm text-gray-600 mt-1",
};

// SIGNUP 
export const FIELDS = [
    { name: "name", type: "text", placeholder: "Full Name", icon: User },
    { name: "email", type: "email", placeholder: "Email", icon: Mail },
    { name: "password", type: "password", placeholder: "Password", icon: Lock },
];

export const Inputwrapper =
    "flex items-center border border-teal-200 rounded-lg px-3 py-2.5 focus-within:ring-2 focus-within:ring-teal-500 focus-within:border-teal-500 transition-all duration-200 bg-teal-50/50";

export const BUTTONCLASSES =
    "w-full flex items-center justify-center bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed";

export const MESSAGE_SUCCESS = "bg-green-50 text-green-600 p-3 rounded-lg text-sm mb-4 border border-green-100";
export const MESSAGE_ERROR = "bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-100";

// TASK ITEM
export const getPriorityColor = (priority) => {
    const colors = {
        low: "border-gray-500 bg-gray-50/50 text-gray-700",
        medium: "border-orange-500 bg-orange-50/50 text-orange-700",
        high: "border-yellow-500 bg-yellow-50/50 text-yellow-700",
        urgent: "border-teal-500 bg-teal-50/50 text-teal-700",
    };
    return colors[priority?.toLowerCase()] || "border-gray-500 bg-gray-50/50 text-gray-700";
};

export const getPriorityBadgeColor = (priority) => {
    const colors = {
        low: "bg-gray-100 text-gray-700",
        medium: "bg-orange-100 text-orange-700",
        high: "bg-yellow-100 text-yellow-700",
        urgent: "bg-teal-100 text-teal-700",
    };
    return colors[priority?.toLowerCase()] || "bg-gray-100 text-gray-700";
};

// DASHBOARD
// UI Constants
export const WRAPPER = "p-4 md:p-6 h-screen overflow-hidden";
export const HEADER = "flex flex-col md:flex-row justify-between items-start md:items-center mb-4 md:mb-6 gap-3";
export const ADD_BUTTON =
    "flex items-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-600 text-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 w-full md:w-auto justify-center text-sm md:text-base";
export const STATS_GRID = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6";
export const STAT_CARD =
    "p-3 md:p-4 rounded-xl bg-white/90 backdrop-blur-sm shadow-md border border-teal-100 hover:shadow-lg transition-all duration-300 min-w-0";
export const ICON_WRAPPER = "p-1.5 md:p-2 rounded-lg";
export const VALUE_CLASS = "text-lg md:text-2xl font-bold truncate bg-gradient-to-r from-teal-500 to-emerald-600 bg-clip-text text-transparent";
export const LABEL_CLASS = "text-xs text-gray-500 truncate";

// Stats definitions
export const STATS = [
    { key: "total", label: "Total Tasks", icon: HomeIcon, iconColor: "bg-teal-50 text-teal-500", valueKey: "total", gradient: true },
    { key: "lowPriority", label: "Low Priority", icon: Flame, iconColor: "bg-gray-50 text-gray-500", borderColor: "border-gray-100", valueKey: "lowPriority", textColor: "text-gray-600" },
    { key: "mediumPriority", label: "Medium Priority", icon: Flame, iconColor: "bg-orange-50 text-orange-500", borderColor: "border-orange-100", valueKey: "mediumPriority", textColor: "text-orange-600" },
    { key: "highPriority", label: "High Priority", icon: Flame, iconColor: "bg-yellow-50 text-yellow-500", borderColor: "border-yellow-100", valueKey: "highPriority", textColor: "text-yellow-600" },
];

// Filter options
export const FILTER_OPTIONS = ["all", "today", "week", "high", "medium", "low"];
export const FILTER_LABELS = {
    all: "All Tasks",
    today: "Today's Tasks",
    week: "This Week",
    high: "High Priority",
    medium: "Medium Priority",
    low: "Low Priority",
};

// Empty state
export const EMPTY_STATE = {
    wrapper: "p-6 bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-teal-100 text-center",
    iconWrapper: "w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4",
    btn: "px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-lg text-sm font-medium hover:shadow-md transition-all duration-200",
};

// Filter UI Constants (updated to teal-emerald theme)
export const FILTER_WRAPPER = "flex items-center justify-between bg-white/90 backdrop-blur-sm p-4 rounded-xl shadow-md border border-teal-100";
export const SELECT_CLASSES = "px-3 py-2 border border-teal-200 rounded-lg focus:ring-2 focus:ring-teal-500 md:hidden text-sm";
export const TABS_WRAPPER = "hidden md:flex space-x-1 bg-teal-50 p-1 rounded-lg";
export const TAB_BASE = "px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200";
export const TAB_ACTIVE = "bg-white text-teal-700 shadow-sm border border-teal-100";
export const TAB_INACTIVE = "text-gray-600 hover:bg-teal-100/50";

// Sort Options for filtering tasks
export const SORT_OPTIONS = [
    { id: "newest", label: "Newest", icon: <SortDesc className="w-3 h-3 text-teal-500" /> },
    { id: "oldest", label: "Oldest", icon: <SortAsc className="w-3 h-3 text-teal-500" /> },
    { id: "priority", label: "Priority", icon: <Award className="w-3 h-3 text-teal-500" /> },
];

// Main page layout classes
export const CT_CLASSES = {
    page: "p-4 md:p-6 h-screen overflow-hidden",
    header: "flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-3 md:gap-4",
    titleWrapper: "flex-1 min-w-0",
    title: "text-xl md:text-2xl lg:text-3xl font-bold text-gray-800 flex items-center gap-2 truncate",
    subtitle: "text-xs md:text-sm text-gray-500 mt-1 ml-7 md:ml-8",
    sortContainer: "w-full md:w-auto mt-2 md:mt-0",
    sortBox: "flex items-center justify-between bg-white/90 backdrop-blur-sm p-2 md:p-3 rounded-xl shadow-md border border-teal-100 w-full md:w-auto",
    filterLabel: "flex items-center gap-2 text-gray-700 font-medium text-sm",
    select: "px-2 py-1 md:px-3 md:py-2 border border-teal-200 rounded-lg focus:ring-2 focus:ring-teal-500 md:hidden text-xs md:text-sm",
    btnGroup: "hidden md:flex space-x-1 bg-teal-50 p-1 rounded-lg ml-2 md:ml-3",
    btnBase: "px-2 py-1 md:px-3 md:py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1",
    btnActive: "bg-white text-teal-700 shadow-sm border border-teal-100",
    btnInactive: "text-gray-600 hover:text-teal-700 hover:bg-teal-100/50",
    list: "space-y-3 md:space-y-4",
    emptyState: "p-4 md:p-8 bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-teal-100 text-center",
    emptyIconWrapper: "w-12 h-12 md:w-16 md:h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4",
    emptyTitle: "text-base md:text-lg font-semibold text-gray-800 mb-2",
    emptyText: "text-xs md:text-sm text-gray-500",
};

// Reusable layout styling
export const layoutClasses = {
    container: "p-6 h-screen overflow-hidden",
    headerWrapper: "flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4",
    sortBox: "flex items-center justify-between bg-white/90 backdrop-blur-sm p-3 rounded-xl shadow-md border border-teal-100 w-full md:w-auto",
    select: "px-3 py-2 border border-teal-200 rounded-lg focus:ring-2 focus:ring-teal-500 md:hidden text-sm",
    tabWrapper: "hidden md:flex space-x-1 bg-teal-50 p-1 rounded-lg ml-3",
    tabButton: (active) =>
        `px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${active
            ? "bg-white text-teal-700 shadow-sm border border-teal-100"
            : "text-gray-600 hover:text-teal-700 hover:bg-teal-100/50"
        }`,
    addBox: "hidden md:block p-5 border-2 border-dashed border-teal-200 rounded-xl hover:border-teal-400 transition-colors cursor-pointer mb-6 bg-teal-50/50 group",
    emptyState: "p-8 bg-white/90 backdrop-blur-sm rounded-xl shadow-md border border-teal-100 text-center",
    emptyIconBg: "w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4",
    emptyBtn: "px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white rounded-lg text-sm font-medium transition-all duration-200",
};

// Menu options in TaskItem
export const MENU_OPTIONS = [
    { action: "edit", label: "Edit Task", icon: <Edit2 size={14} className="text-teal-500" /> },
    { action: "delete", label: "Delete Task", icon: <Trash2 size={14} className="text-red-600" /> },
];

// Task item styles
export const TI_CLASSES = {
    wrapper: "group p-4 sm:p-5 rounded-xl shadow-md bg-white/90 backdrop-blur-sm border-l-4 hover:shadow-lg transition-all duration-300 border border-teal-100",
    leftContainer: "flex items-start gap-2 sm:gap-3 flex-1 min-w-0",
    completeBtn: "mt-0.5 sm:mt-1 p-1 sm:p-1.5 rounded-full hover:bg-teal-50 transition-colors duration-200",
    checkboxIconBase: "w-4 h-4 sm:w-5 sm:h-5",
    titleBase: "text-base sm:text-lg font-medium truncate",
    priorityBadge: "text-xs px-2 py-0.5 rounded-full shrink-0",
    description: "text-sm text-gray-600 mt-1 truncate",
    subtasksContainer: "mt-3 sm:mt-4 space-y-2 sm:space-y-3 bg-teal-50/30 p-2 sm:p-3 rounded-lg border border-teal-100",
    progressBarBg: "h-1.5 bg-teal-50 rounded-full overflow-hidden",
    progressBarFg: "h-full bg-gradient-to-r from-teal-500 to-emerald-600 transition-all duration-300",
    rightContainer: "flex flex-col items-end gap-2 sm:gap-3",
    menuButton: "p-1 sm:p-1.5 hover:bg-teal-50 rounded-lg text-gray-500 hover:text-teal-700 transition-colors duration-200",
    menuDropdown: "absolute right-0 mt-1 w-40 sm:w-48 bg-white/90 backdrop-blur-md border border-teal-100 rounded-xl shadow-lg z-10 overflow-hidden animate-fadeIn",
    dateRow: "flex items-center gap-1.5 text-xs font-medium whitespace-nowrap",
    createdRow: "flex items-center gap-1.5 text-xs text-gray-400 whitespace-nowrap",
};

// Avatar generator
export const generateAvatar = (name = 'User') =>
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;