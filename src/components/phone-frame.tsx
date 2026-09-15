/**
 * Hardware around a screen. The frame is fixed — bezel, corner radius, dynamic
 * island, side buttons — and the caller supplies whatever fills the screen, so
 * any mockup can be shown as a photographed phone rather than a floating card.
 *
 * The island sits on its own status strip above the content instead of over it:
 * an app header and a status bar stacked is what a real screenshot looks like.
 */
export function PhoneFrame({
    children,
    statusClassName = "bg-[#075E54]",
    className = "",
}: {
    children: React.ReactNode;
    /** Background of the status strip. Match it to the app's own top bar. */
    statusClassName?: string;
    className?: string;
}) {
    return (
        <div className={`relative mx-auto w-full max-w-[300px] ${className}`}>
            {/* Side buttons: silhouette only, they never take a pointer. */}
            <span
                aria-hidden="true"
                className="absolute left-[-3px] top-[112px] h-14 w-[3px] rounded-l-full bg-[#0a0f0d]"
            />
            <span
                aria-hidden="true"
                className="absolute left-[-3px] top-[184px] h-14 w-[3px] rounded-l-full bg-[#0a0f0d]"
            />
            <span
                aria-hidden="true"
                className="absolute right-[-3px] top-[150px] h-20 w-[3px] rounded-r-full bg-[#0a0f0d]"
            />

            <div className="relative rounded-[46px] bg-[#141b18] p-[9px] shadow-2xl ring-1 ring-white/25">
                {/* The screen is the handset's real proportion, not the content's:
                    a thread short enough to read still has to sit on a phone. */}
                <div className="relative flex aspect-[9/19.5] flex-col overflow-hidden rounded-[38px] bg-white">
                    <div className={`relative h-9 shrink-0 ${statusClassName}`}>
                        <span
                            aria-hidden="true"
                            className="absolute left-1/2 top-1.5 h-[24px] w-[84px] -translate-x-1/2 rounded-full bg-[#0a0f0d]"
                        />
                    </div>
                    <div className="min-h-0 flex-1">{children}</div>
                    <span
                        aria-hidden="true"
                        className="absolute bottom-2 left-1/2 h-[5px] w-[112px] -translate-x-1/2 rounded-full bg-black/25"
                    />
                </div>
            </div>
        </div>
    );
}
