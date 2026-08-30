"use client";

import { useMemo, useState } from "react";

type Testimonial = {
  name: string;
  city: string;
  service: string;
  rating: number;
  comment: string;
};

const TESTIMONIALS: Testimonial[] = [
  { name: "Thandeka Mokoena", city: "Sandton, Gauteng", service: "Plumbing", rating: 5, comment: "The plumber arrived on time, explained the problem clearly and fixed our leaking tap without leaving a mess." },
  { name: "Jacques van der Merwe", city: "Durbanville, Western Cape", service: "Electrical", rating: 5, comment: "I loved comparing quotes in one place. The electrician was professional and the payment process felt secure." },
  { name: "Noluthando Jacobs", city: "Umhlanga, KwaZulu-Natal", service: "Cleaning", rating: 4, comment: "Our move-out clean was booked quickly and the team did an amazing job. The house looked brand new." },
  { name: "Ayesha Khan", city: "Rosebank, Gauteng", service: "Handyman", rating: 5, comment: "LocalFix made it easy to find someone for shelves, curtain rails and a TV mount. Everything was done in one visit." },
  { name: "Michael Dlamini", city: "Centurion, Gauteng", service: "Solar", rating: 5, comment: "The solar installer gave a detailed quote and helped us understand exactly what was included before we accepted." },
  { name: "Carmen Botha", city: "Stellenbosch, Western Cape", service: "Painting", rating: 5, comment: "The painting team was neat, friendly and finished sooner than expected. The quote matched the final price." },
  { name: "Sibusiso Nkosi", city: "Midrand, Gauteng", service: "Pest Control", rating: 5, comment: "Fast response, fair price and no surprises. The cockroach treatment worked perfectly after one visit." },
  { name: "Priya Naidoo", city: "Ballito, KwaZulu-Natal", service: "Air Conditioning", rating: 5, comment: "Our aircon service was handled professionally. I appreciated the updates and being able to track everything." },
  { name: "Willem Pretorius", city: "Pretoria East, Gauteng", service: "Roofing", rating: 5, comment: "We had a roof leak after heavy rain. LocalFix helped us get quotes quickly and the repair has held perfectly." },
  { name: "Lerato Molefe", city: "Bloemfontein, Free State", service: "Garden Services", rating: 4, comment: "The garden clean-up was excellent. The team arrived with the right equipment and left everything tidy." },
  { name: "Fatima Essop", city: "Claremont, Western Cape", service: "Home Internet Setup", rating: 5, comment: "The technician set up our fibre router and mesh Wi-Fi properly. We finally have signal in every room." },
  { name: "Gareth Williams", city: "Gqeberha, Eastern Cape", service: "Removals", rating: 5, comment: "The movers were careful with our furniture and communicated well from quote to delivery." },
  { name: "Nomsa Khumalo", city: "Fourways, Gauteng", service: "Appliance Repairs", rating: 5, comment: "My washing machine was repaired the same week. The quote was clear and the technician was respectful." },
  { name: "Ruan Engelbrecht", city: "George, Western Cape", service: "Security", rating: 5, comment: "The CCTV installation was clean and the installer helped us set up the app before leaving." },
  { name: "Zinhle Sithole", city: "Hillcrest, KwaZulu-Natal", service: "Pools", rating: 5, comment: "Our pool pump replacement was quick and fairly priced. The provider even explained how to maintain it." },
  { name: "Megan Pillay", city: "Randburg, Gauteng", service: "Carpentry", rating: 5, comment: "The cupboard repair was done beautifully. It was refreshing to deal with someone verified and professional." },
  { name: "Sipho Madonsela", city: "Nelspruit, Mpumalanga", service: "Welding", rating: 5, comment: "Our security gate repair was handled fast. The quote, chat and payment all stayed on the platform." },
  { name: "Tanya de Beer", city: "Paarl, Western Cape", service: "Flooring", rating: 5, comment: "The tiler was punctual and the finish looks fantastic. I liked seeing the job details and quote in writing." },
  { name: "Ahmed Mahomed", city: "Polokwane, Limpopo", service: "Glass & Aluminium", rating: 5, comment: "The shower door installation was smooth from request to payment. The provider was friendly and efficient." },
  { name: "Bronwyn Adams", city: "Sea Point, Western Cape", service: "Cleaning", rating: 5, comment: "Booking a deep clean before guests arrived was so simple. The communication was excellent." },
  { name: "Kabelo Ramaphosa", city: "Rustenburg, North West", service: "Paving", rating: 5, comment: "Our driveway paving quote was detailed and the work was completed exactly as agreed." },
  { name: "Melissa Govender", city: "Pietermaritzburg, KwaZulu-Natal", service: "Electrical", rating: 5, comment: "The electrician sorted out our tripping DB board and gave us confidence that the house was safe." },
  { name: "Herman Kruger", city: "Kempton Park, Gauteng", service: "Garage Doors", rating: 5, comment: "The garage door motor was replaced quickly. I liked that provider details unlocked only after payment." },
  { name: "Bongani Zulu", city: "East London, Eastern Cape", service: "Builders", rating: 5, comment: "The small boundary wall repair was handled professionally and the quote was easy to compare." },
  { name: "Chantelle Meyer", city: "Somerset West, Western Cape", service: "Plumbing", rating: 5, comment: "Emergency plumbing is stressful, but LocalFix made it feel organised. The provider was excellent." },
  { name: "Musa Mthembu", city: "Soweto, Gauteng", service: "Pest Control", rating: 5, comment: "Great service and clear aftercare advice. The price was fair and everything was handled on-platform." },
  { name: "Elri Steyn", city: "Bellville, Western Cape", service: "Painting", rating: 5, comment: "Our exterior paint job looks amazing. The provider kept us updated and cleaned up every afternoon." },
  { name: "Refilwe Mashaba", city: "Midrand, Gauteng", service: "Solar", rating: 5, comment: "The installer explained battery options clearly and gave a quote that was easy to understand." },
  { name: "Daniel Petersen", city: "Woodstock, Western Cape", service: "Home Internet Setup", rating: 5, comment: "Our home office Wi-Fi is finally reliable. The mesh network setup was worth every rand." },
  { name: "Nadia Osman", city: "Benoni, Gauteng", service: "Appliance Repairs", rating: 5, comment: "The fridge repair was quick, professional and well-priced. I would definitely use LocalFix again." },
  { name: "Mpho Sebola", city: "Tzaneen, Limpopo", service: "Garden Services", rating: 5, comment: "Tree trimming and garden clean-up were done safely and neatly. Very happy with the result." },
  { name: "Ryan Joubert", city: "Umhlanga, KwaZulu-Natal", service: "Air Conditioning", rating: 5, comment: "The technician serviced all three aircons and explained what needed attention without upselling." },
  { name: "Zanele Ncube", city: "Bryanston, Gauteng", service: "Roofing", rating: 5, comment: "The roof waterproofing was completed before the next storm. The signed job card gave me peace of mind." },
  { name: "Warren Naicker", city: "Port Shepstone, KwaZulu-Natal", service: "Security", rating: 5, comment: "Alarm installation was neat and the app setup was explained clearly. The process felt safe." },
  { name: "Robyn Fisher", city: "Green Point, Western Cape", service: "Handyman", rating: 5, comment: "Small maintenance jobs are usually annoying to organise. LocalFix made it quick and simple." },
  { name: "Tshepo Morake", city: "Vanderbijlpark, Gauteng", service: "Property Maintenance", rating: 4, comment: "As a landlord, I appreciate having requests, quotes, payments and job records in one place." },
];

const PAGE_SIZE = 3;

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function TestimonialsCarousel() {
  const pages = useMemo(() => {
    const result: Testimonial[][] = [];
    for (let i = 0; i < TESTIMONIALS.length; i += PAGE_SIZE) result.push(TESTIMONIALS.slice(i, i + PAGE_SIZE));
    return result;
  }, []);
  const [page, setPage] = useState(0);
  const current = pages[page] ?? pages[0];

  function previous() {
    setPage((value) => (value === 0 ? pages.length - 1 : value - 1));
  }

  function next() {
    setPage((value) => (value === pages.length - 1 ? 0 : value + 1));
  }

  return (
    <div className="mt-10">
      <div className="flex items-center justify-center gap-2 sm:justify-end">
        <button
          type="button"
          onClick={previous}
          className="btn btn-ghost !h-10 !w-10 !px-0 !py-0"
          aria-label="Previous testimonials"
        >
          ←
        </button>
        <button
          type="button"
          onClick={next}
          className="btn btn-ghost !h-10 !w-10 !px-0 !py-0"
          aria-label="Next testimonials"
        >
          →
        </button>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3" aria-live="polite">
        {current.map((testimonial) => (
          <article key={`${testimonial.name}-${testimonial.city}`} className="card card-hover flex h-full flex-col p-6">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-teal-50 text-sm font-black text-teal-700 ring-1 ring-teal-100">
                {initials(testimonial.name)}
              </span>
              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold text-navy-800">{testimonial.name}</h3>
                <p className="truncate text-xs text-slate-500">{testimonial.city}</p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="rounded-full bg-navy-50 px-3 py-1 text-[11px] font-bold text-navy-700">
                {testimonial.service}
              </span>
              <span className="text-sm font-bold text-warn" aria-label={`${testimonial.rating} star rating`}>
                {"★".repeat(testimonial.rating)}
              </span>
            </div>

            <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-slate-700">
              “{testimonial.comment}”
            </blockquote>
          </article>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2" aria-label="Testimonial pages">
        {pages.map((_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setPage(index)}
            className={`h-2.5 rounded-full transition-all ${index === page ? "w-8 bg-teal-600" : "w-2.5 bg-slate-300 hover:bg-slate-400"}`}
            aria-label={`Show testimonial page ${index + 1}`}
            aria-current={index === page ? "true" : undefined}
          />
        ))}
      </div>

      <p className="mt-4 text-center text-xs text-slate-500">
        Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, TESTIMONIALS.length)} of {TESTIMONIALS.length} testimonials
      </p>
    </div>
  );
}
