import Image from "next/image";
import Login from '../app/login/page'; // Updated path to reflect location outside the components folder
import Link from 'next/link';
import Homepage from "./components/homepage";

export default function Home() {
  return (
    <div>
      <Homepage />
    </div>
  );
}
