import { Link } from 'react-router-dom';

/**
 * The shared product-suite lockup: "Atlasly | MEETLY". Appears on both
 * products' home screens so either one is always one click away, no matter
 * which you're currently in. Whichever is `active` gets the big wordmark
 * treatment; the other shrinks to the small red badge — so the one you're
 * in always reads as "home," the other as "also available." `theme="dark"`
 * is for Meetly's reversed (dark-background) chrome; `theme="light"`
 * (default) matches Atlasly's.
 */
const SuiteNav = ({ theme = 'light', active = 'atlasly' }) => {
  const bigTextColor = theme === 'dark' ? 'text-white' : 'text-primary-600';
  const bigClass = `text-xl sm:text-2xl font-display font-bold ${bigTextColor} hover:opacity-80 transition-opacity`;
  const badgeClass =
    'bg-primary-600 text-white font-display font-bold text-xs sm:text-sm px-3 py-1.5 rounded-md tracking-wide uppercase shadow-lg hover:bg-primary-700 transition-colors';

  return (
    <div className="flex items-center gap-3">
      <Link to="/dashboard" className={active === 'atlasly' ? bigClass : badgeClass}>
        Atlasly
      </Link>
      <span className="w-0.5 h-6 bg-primary-500 rounded-full" />
      <Link to="/meetly" className={active === 'meetly' ? bigClass : badgeClass}>
        Meetly
      </Link>
    </div>
  );
};

export default SuiteNav;
