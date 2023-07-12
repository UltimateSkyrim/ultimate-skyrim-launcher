import { expect } from "@loopback/testlab";
import { asyncFilter } from "../../../../shared/util/asyncFilter";

describe("asyncFilter", () => {
  interface Person {
    name: string;
    age: number;
  }

  async function filterAdults(person: Person): Promise<boolean> {
    return person.age >= 18;
  }

  const people: Person[] = [
    { name: "John", age: 25 },
    { name: "Alice", age: 30 },
    { name: "Bob", age: 16 },
  ];

  it("should filter adults", async () => {
    const filtered = await asyncFilter(people, filterAdults);

    expect(filtered).to.deepEqual([
      { name: "John", age: 25 },
      { name: "Alice", age: 30 },
    ]);
  });

  it("should filter no adults", async () => {
    const filtered = await asyncFilter(
      people,
      async (person) => person.age >= 100
    );

    expect(filtered).to.deepEqual([]);
  });
});
