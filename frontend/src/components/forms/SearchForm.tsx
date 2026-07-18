"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";

const countries = [
  "Canada",
  "United States",
  "United Kingdom",
  "Australia",
  "Germany",
];

const searchFormSchema = z.object({
  country: z.string().min(1, "Please select a country."),
  region: z.string().trim().optional(),
  degree: z.enum(["Masters", "PhD"], { message: "Please select a degree." }),
  researchField: z
    .string()
    .trim()
    .min(3, "Research field must be at least 3 characters."),
});

export interface SearchFormData {
  country: string;
  region?: string;
  degree: "Masters" | "PhD";
  researchField: string;
}

interface SearchFormProps {
  onSubmit?: (formData: SearchFormData) => void | Promise<void>;
}

const inputClassName =
  "w-full rounded-xl border bg-white/85 px-4 py-3.5 text-sm text-slate-900 shadow-sm outline-none transition-all duration-300 placeholder:text-slate-400 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus:-translate-y-0.5 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100";

export default function SearchForm({ onSubmit }: SearchFormProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isCountryMenuOpen, setIsCountryMenuOpen] = useState(false);
  const [countryQuery, setCountryQuery] = useState("");
  const [activeCountryIndex, setActiveCountryIndex] = useState(0);
  const countrySelectRef = useRef<HTMLDivElement>(null);

  const {
    control,
    handleSubmit,
    register,
    formState: { errors, isSubmitting },
  } = useForm<SearchFormData>({
    resolver: zodResolver(searchFormSchema),
    defaultValues: {
      country: "",
      region: "",
      researchField: "",
    },
  });

  const filteredCountries = countries.filter((country) =>
    country.toLowerCase().includes(countryQuery.toLowerCase()),
  );

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(() => setIsVisible(true));

    return () => window.cancelAnimationFrame(animationFrame);
  }, []);

  useEffect(() => {
    const closeMenuOnOutsideClick = (event: PointerEvent) => {
      if (!countrySelectRef.current?.contains(event.target as Node)) {
        setIsCountryMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeMenuOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeMenuOnOutsideClick);
  }, []);

  const submitSearch = async (formData: SearchFormData) => {
    console.log(formData);
    await onSubmit?.(formData);
  };

  return (
    <section
      className={`w-full transition-all duration-700 ease-out ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"
      }`}
      aria-labelledby="search-form-heading"
    >
      <div className="rounded-[1.65rem] border border-white/90 bg-white/80 p-5 shadow-[0_24px_70px_-28px_rgba(15,23,42,0.28)] backdrop-blur-xl sm:p-7">
        <div className="mb-6 flex flex-col gap-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">
            Start your search
          </p>
          <h2 id="search-form-heading" className="text-xl font-semibold tracking-tight text-slate-950">
            Tell us what you&apos;re looking for
          </h2>
        </div>

        <form className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2" onSubmit={handleSubmit(submitSearch)} noValidate>
          <div className="relative" ref={countrySelectRef}>
            <label htmlFor="country" className="mb-2 block text-sm font-semibold text-slate-800">
              Country <span aria-hidden="true" className="text-indigo-600">*</span>
            </label>

            <Controller
              name="country"
              control={control}
              render={({ field }) => {
                const selectCountry = (country: string) => {
                  field.onChange(country);
                  setCountryQuery(country);
                  setIsCountryMenuOpen(false);
                };

                const openCountryMenu = () => {
                  setCountryQuery(field.value ?? "");
                  setActiveCountryIndex(0);
                  setIsCountryMenuOpen(true);
                };

                return (
                  <>
                    <div className="relative">
                      <input
                        id="country"
                        type="text"
                        role="combobox"
                        autoComplete="off"
                        aria-autocomplete="list"
                        aria-expanded={isCountryMenuOpen}
                        aria-controls="country-options"
                        aria-activedescendant={
                          isCountryMenuOpen && filteredCountries[activeCountryIndex]
                            ? `country-option-${activeCountryIndex}`
                            : undefined
                        }
                        aria-invalid={Boolean(errors.country)}
                        aria-describedby={errors.country ? "country-error" : undefined}
                        placeholder="Select Country"
                        value={isCountryMenuOpen ? countryQuery : field.value ?? ""}
                        className={`${inputClassName} pr-11 ${
                          errors.country ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100" : "border-slate-200"
                        }`}
                        onFocus={openCountryMenu}
                        onBlur={field.onBlur}
                        onChange={(event) => {
                          setCountryQuery(event.target.value);
                          setActiveCountryIndex(0);
                          setIsCountryMenuOpen(true);
                          field.onChange("");
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "ArrowDown") {
                            event.preventDefault();
                            if (!isCountryMenuOpen) {
                              openCountryMenu();
                              return;
                            }
                            setActiveCountryIndex((index) =>
                              Math.min(index + 1, Math.max(filteredCountries.length - 1, 0)),
                            );
                          }

                          if (event.key === "ArrowUp") {
                            event.preventDefault();
                            setActiveCountryIndex((index) => Math.max(index - 1, 0));
                          }

                          if (event.key === "Enter" && isCountryMenuOpen && filteredCountries[activeCountryIndex]) {
                            event.preventDefault();
                            selectCountry(filteredCountries[activeCountryIndex]);
                          }

                          if (event.key === "Escape") {
                            setIsCountryMenuOpen(false);
                          }
                        }}
                      />
                      <svg
                        className={`pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-slate-500 transition-transform duration-200 ${
                          isCountryMenuOpen ? "rotate-180" : "rotate-0"
                        }`}
                        viewBox="0 0 20 20"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>

                    <div
                      id="country-options"
                      role="listbox"
                      aria-label="Countries"
                      aria-hidden={!isCountryMenuOpen}
                      className={`absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_45px_-18px_rgba(15,23,42,0.28)] transition-all duration-200 ${
                        isCountryMenuOpen
                          ? "translate-y-0 opacity-100"
                          : "pointer-events-none -translate-y-2 opacity-0"
                      }`}
                    >
                      {filteredCountries.length > 0 ? (
                        filteredCountries.map((country, index) => (
                          <button
                            key={country}
                            id={`country-option-${index}`}
                            type="button"
                            role="option"
                            aria-selected={field.value === country}
                            tabIndex={isCountryMenuOpen ? 0 : -1}
                            className={`flex w-full items-center rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 ${
                              activeCountryIndex === index
                                ? "bg-indigo-50 text-indigo-800"
                                : "text-slate-700 hover:bg-slate-50"
                            }`}
                            onMouseEnter={() => setActiveCountryIndex(index)}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => selectCountry(country)}
                          >
                            {country}
                          </button>
                        ))
                      ) : (
                        <p className="px-3 py-2.5 text-sm text-slate-500">No matching countries found.</p>
                      )}
                    </div>
                  </>
                );
              }}
            />
            <p
              id="country-error"
              className={`mt-1.5 min-h-5 text-xs font-medium text-rose-600 transition-all duration-200 ${
                errors.country ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
              }`}
              aria-live="polite"
            >
              {errors.country?.message ?? " "}
            </p>
          </div>

          <div>
            <label htmlFor="region" className="mb-2 block text-sm font-semibold text-slate-800">
              Region / Province <span className="font-normal text-slate-400">(Optional)</span>
            </label>
            <input
              id="region"
              type="text"
              autoComplete="address-level1"
              placeholder="e.g. Ontario"
              className={`${inputClassName} border-slate-200`}
              {...register("region")}
            />
            <p className="mt-1.5 min-h-5 text-xs" aria-hidden="true">&nbsp;</p>
          </div>

          <div>
            <label htmlFor="degree" className="mb-2 block text-sm font-semibold text-slate-800">
              Degree <span aria-hidden="true" className="text-indigo-600">*</span>
            </label>
            <div className="relative">
              <select
                id="degree"
                defaultValue=""
                aria-invalid={Boolean(errors.degree)}
                aria-describedby={errors.degree ? "degree-error" : undefined}
                className={`${inputClassName} appearance-none pr-11 ${
                  errors.degree ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100" : "border-slate-200"
                }`}
                {...register("degree")}
              >
                <option value="" disabled>
                  Select Degree
                </option>
                <option value="Masters">Masters</option>
                <option value="PhD">PhD</option>
              </select>
              <svg
                className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-slate-500"
                viewBox="0 0 20 20"
                fill="none"
                aria-hidden="true"
              >
                <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p
              id="degree-error"
              className={`mt-1.5 min-h-5 text-xs font-medium text-rose-600 transition-all duration-200 ${
                errors.degree ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
              }`}
              aria-live="polite"
            >
              {errors.degree?.message ?? " "}
            </p>
          </div>

          <div>
            <label htmlFor="researchField" className="mb-2 block text-sm font-semibold text-slate-800">
              Research Field <span aria-hidden="true" className="text-indigo-600">*</span>
            </label>
            <input
              id="researchField"
              type="text"
              autoComplete="off"
              placeholder="e.g. Artificial Intelligence"
              aria-invalid={Boolean(errors.researchField)}
              aria-describedby={errors.researchField ? "research-field-error" : undefined}
              className={`${inputClassName} ${
                errors.researchField ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100" : "border-slate-200"
              }`}
              {...register("researchField")}
            />
            <p
              id="research-field-error"
              className={`mt-1.5 min-h-5 text-xs font-medium text-rose-600 transition-all duration-200 ${
                errors.researchField ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
              }`}
              aria-live="polite"
            >
              {errors.researchField?.message ?? " "}
            </p>
          </div>

          <div className="mt-1 md:col-span-2">
            <button
              type="submit"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
              className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-sky-500 px-5 py-4 text-sm font-semibold text-white shadow-[0_16px_34px_-14px_rgba(79,70,229,0.82)] transition-all duration-300 hover:scale-[1.015] hover:shadow-[0_20px_38px_-12px_rgba(79,70,229,0.78)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 active:scale-[0.99] disabled:cursor-not-allowed disabled:transform-none disabled:opacity-60 disabled:shadow-none"
            >
              {isSubmitting ? (
                <>
                  <svg className="mr-2 size-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle className="opacity-30" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" />
                    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Finding Supervisors...
                </>
              ) : (
                <>
                  <svg className="mr-2 size-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="2" />
                    <path d="m16 16 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Find Supervisors
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
