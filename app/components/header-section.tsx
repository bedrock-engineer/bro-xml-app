import type { HeaderSection } from "../types/header-types";

interface HeaderSectionsProps {
  sections: Array<HeaderSection>;
}

export function HeaderSections({ sections }: HeaderSectionsProps) {
  return (
    <div className="grid grid-cols-2 gap-4  items-start">
      {sections.map((section) => (
        // TODO use Disclosure, DisclosurePanel, Heading rather than details
        <details key={section.id} className="border border-gray-200 rounded">
          <summary className="px-4 py-2 bg-gray-50 cursor-pointer hover:bg-gray-100 font-medium">
            {section.title}
          </summary>

          <div className="p-4">
            <dl className="grid grid-cols-[auto_1fr] items-start gap-x-4 gap-y-2 text-sm">
              {section.items.map((item, index) => (
                <div key={index} className="contents">
                  <dt className="text-gray-500">{item.label}</dt>
                  <dd>{item.value ?? "-"}</dd>
                </div>
              ))}
            </dl>
          </div>
        </details>
      ))}
    </div>
  );
}
