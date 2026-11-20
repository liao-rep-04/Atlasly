import { Link } from 'react-router-dom';

/**
 * The shared product-suite lockup: "Atlasly | MEETLY". Appears on both
 * products' home screens so either one is always one click away, no matter
 * which you're currently in. `theme="dark"` is for Meetly's reversed
 * (dark-background) chrome; `theme="light"` (default) matches Atlasly's.
 */
const SuiteNav = ({ theme = 'light' }) => {
  const atlaslyColor = theme === 'dark' ? 'text-white' : 'text-primary-600';

  return (
    <div className="flex items-center gap-3">
      <Link
        to="/dashboard"
        className={`text-xl sm:text-2xl font-display font-bold ${atlaslyColor} hover:opacity-80 transition-opacity`}
      >
        Atlasly
      </Link>
      <span className="w-0.5 h-6 bg-primary-500 rounded-full" />
      <Link
        to="/meetly"
        className="bg-primary-600 text-white font-display font-bold text-xs sm:text-sm px-3 py-1.5 rounded-md tracking-wide uppercase shadow-lg hover:bg-primary-700 transition-colors"
      >
        Meetly
      </Link>
    </div>
  );
};

export default SuiteNav;
