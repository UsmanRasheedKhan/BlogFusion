import Link from "next/link";

const Navbar = () => (
  <nav className="bg-white shadow-sm sticky top-0 z-50">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center h-16">
        <div className="flex-shrink-0">
          <span className="text-2xl font-bold text-black">
            BLOG FUSION
          </span>
        </div>
        <div className="hidden md:block">
          <div className="ml-10 flex items-center space-x-8">
            <Link href="/" className="text-gray-700 hover:text-black transition-colors duration-200">
              Home
            </Link>
            <Link href="/#about" className="text-gray-700 hover:text-black transition-colors duration-200">
              About
            </Link>
            <Link href="/#services" className="text-gray-700 hover:text-black transition-colors duration-200">
              Services
            </Link>
            <Link href="/blogfeed" className="text-black font-medium">
              Blog Feed
            </Link>
            <Link href="/#contact" className="px-4 py-2 rounded-full bg-green-600 text-white hover:bg-green-700 transition-colors duration-200">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </div>
  </nav>
);

export default Navbar;