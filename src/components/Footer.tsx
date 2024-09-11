import Link from "next/link";
import React from "react"

export default function Footer() {
    return (
        <section className="max-w-7xl mx-auto border-t px-4">
            <div className="flex justify-between py-8">
                <p className="text-primary tracking-tight">
                Designed and Developed by{" "}
                <Link href={"/"} className="font-bold">
                    Neel Contractor
                </Link>
                </p>
            </div>
         </section>
    )
}