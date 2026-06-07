export default function TabBar({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 p-1 rounded-xl bg-primary-dark/50 border border-primary/30 mb-6 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`flex-1 min-w-fit px-4 py-2.5 rounded-lg text-sm transition-all whitespace-nowrap ${
            active === tab.key
              ? 'tab-active'
              : 'text-green-300 hover:bg-primary/30'
          }`}
        >
          {tab.icon && <span className="mr-1.5">{tab.icon}</span>}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
