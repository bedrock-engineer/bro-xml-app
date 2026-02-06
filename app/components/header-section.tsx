import {
  Button,
  Disclosure,
  DisclosurePanel,
  Heading,
} from "react-aria-components";
import type { HeaderSection } from "../types/header-types";

interface HeaderSectionsProps {
  sections: Array<HeaderSection>;
}

export function HeaderSections({ sections }: HeaderSectionsProps) {
  return (
    <div className="grid grid-cols-2 gap-4  items-start">
      {sections.map((section) => (
        <Disclosure key={section.id} className="border border-gray-200 rounded">
          <Heading>
            <Button
              slot="trigger"
              className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-100 flex items-center justify-between text-left transition-color"
            >
              <span className="font-medium text-gray-800">{section.title}</span>
              <span className="text-gray-500 data-expanded:hidden">+</span>
              <span className="text-gray-500 hidden data-expanded:inline">
                −
              </span>
            </Button>
          </Heading>

          <DisclosurePanel className="bg-white">
            <dl className="space-y-2 p-4 overflow-x-auto">
              {section.items.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[200px_1fr] gap-4 text-sm"
                >
                  <dt className="text-gray-600">{item.label}</dt>
                  <dd className="text-gray-900 font-mono text-xs">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </DisclosurePanel>
        </Disclosure>
      ))}
    </div>
  );
}
