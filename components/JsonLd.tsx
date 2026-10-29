export default function JsonLd({ data }: { data: object }) {
  // "<" is escaped so a headline can never close the script tag
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
