import { processTemplateString } from "../src";

describe("Rent Increase Letter Template", () => {
  it("generates letter with agent and multiple tenants", () => {
    const template = `Rent increase letter



[[agent.yes]]{{agent_name}}

{{agent_address_line1}}

{{,ls.agent_address_line2}}

{{,ls.agent_address_line3}}

{{ls.agent_postcode}}[[end:agent.yes]][[agent.no]]

{{landlord_name}}

{{landlord_address_line1}}

{{landlord_address_line2}}

{{landlord_address_line3}}

{{landlord_postcode}}

{{landlord_telephone}}[[end:agent.no]]

{{tenant1_name}}[[tenants.two or tenants.three or tenants.four or tenants.five or tenants.six]]

{{tenant2_name}}[[end:tenants.two or tenants.three or tenants.four or tenants.five or tenants.six]][[tenants.three or tenants.four or tenants.five or tenants.six]]

{{tenant3_name}}[[end:tenants.three or tenants.four or tenants.five or tenants.six]][[tenants.four or tenants.five or tenants.six]]

{{tenant4_name}}[[end:tenants.four or tenants.five or tenants.six]][[tenants.five or tenants.six]]

{{tenant5_name}}[[end:tenants.five or tenants.six]][[tenants.six]]

{{tenant6_name}}[[end:tenants.six]]

{{date}}

Dear Tenant[[tenants.two or tenants.three or tenants.four or tenants.five or tenants.six]]s[[end:tenants.two or tenants.three or tenants.four or tenants.five or tenants.six]],

Re: Rent increase for {{property_address_line1}}{{,ls.property_address_line2}}{{,ls.property_address_line3}}{{ls.property_postcode}}

This letter is to notify you that the rent for the property will increase from the current amount of £{{current_rent}} [[rent_frequency.weekly]]weekly[[end:rent_frequency.weekly]][[rent_frequency.monthly]]monthly[[end:rent_frequency.monthly]][[rent_frequency.yearly]]yearly[[end:rent_frequency.yearly]] to £{{new_rent}} [[new_rent_frequency.weekly]]weekly[[end:new_rent_frequency.weekly]][[new_rent_frequency.monthly]]monthly[[end:new_rent_frequency.monthly]][[new_rent_frequency.yearly]]yearly[[end:new_rent_frequency.yearly]]

The date from which the new rent will be effective is {{new_rent_date}}.

All the other terms of the tenancy agreement will remain in full force and effect.

You have received two copies of this letter. Please sign both copies and return one copy to the address below within 14 days of the date of this letter to confirm your agreement to these new terms.

If you are unable to return a signed copy within this time period, or otherwise would like to discuss the increase with me, please email or telephone me.

I thank you in advance for your cooperation.

Yours sincerely,

[[agent.no]]{{landlord_name}}[[end:agent.no]][[agent.yes]]{{agent_name}}

on behalf of your landlord:

{{landlord_name}}[[end:agent.yes]]

Address for service:[[agent.no]]

{{landlord_address_line1}}{{,ls.landlord_address_line2}}{{,ls.landlord_address_line3}}{{ls.landlord_postcode}}.[[end:agent.no]][[agent.yes]]

{{agent_address_line1}}{{,ls.agent_address_line2}}{{,ls.agent_address_line3}}{{ls.agent_postcode}}[[end:agent.yes]]

[[tenants.one]]I[[end:tenants.one]][[tenants.two or tenants.three or tenants.four or tenants.five or tenants.six]]We[[end:tenants.two or tenants.three or tenants.four or tenants.five or tenants.six]] acknowledge and agree to the terms of your letter dated {{date}}.

{{tenant1_name}}:[[tenants.two or tenants.three or tenants.four or tenants.five or tenants.six]]

{{tenant2_name}}:[[end:tenants.two or tenants.three or tenants.four or tenants.five or tenants.six]][[tenants.three or tenants.four or tenants.five or tenants.six]]

{{tenant3_name}}:[[end:tenants.three or tenants.four or tenants.five or tenants.six]][[tenants.four or tenants.five or tenants.six]]

{{tenant4_name}}:[[end:tenants.four or tenants.five or tenants.six]][[tenants.five or tenants.six]]

{{tenant5_name}}:[[end:tenants.five or tenants.six]][[tenants.six]]

{{tenant6_name}}:[[end:tenants.six]]`;

    const data = {
      // Agent information
      agent: {
        yes: true
      },
      agent_name: "Property Management Ltd",
      agent_address_line1: "123 Agent Street",
      agent_address_line2: "Agent Town",
      agent_address_line3: "Agent County",
      agent_postcode: "AG1 2NT",

      // Landlord information
      landlord_name: "Mr John Smith",
      landlord_address_line1: "456 Landlord Avenue",
      landlord_address_line2: "Landlord City",
      landlord_address_line3: "Landlord County",
      landlord_postcode: "LL1 3RD",
      landlord_telephone: "01234 567890",

      // Tenant information (3 tenants)
      tenants: {
        two: false,
        three: true,
        four: false,
        five: false,
        six: false
      },
      tenant1_name: "Alice Johnson",
      tenant2_name: "Bob Wilson",
      tenant3_name: "Carol Brown",

      // Date
      date: "15th March 2024",

      // Property address
      property_address_line1: "78 Property Road",
      property_address_line2: "Property Village",
      property_address_line3: "Property County",
      property_postcode: "PR1 4OP",

      // Rent information
      current_rent: "800",
      rent_frequency: {
        weekly: false,
        monthly: true,
        yearly: false
      },
      new_rent: "850",
      new_rent_frequency: {
        weekly: false,
        monthly: true,
        yearly: false
      },
      new_rent_date: "1st April 2024"
    };

    const result = processTemplateString(template, data);

    // Verify agent section appears
    expect(result).toContain("Property Management Ltd");
    expect(result).toContain("123 Agent Street");
    expect(result).toContain("Agent Town");
    expect(result).toContain("Agent County");
    expect(result).toContain("AG1 2NT");

    // Verify landlord direct section does not appear (only agent section)
    expect(result).not.toContain("456 Landlord Avenue");

    // Verify multiple tenants (3 tenants)
    expect(result).toContain("Alice Johnson");
    expect(result).toContain("Bob Wilson");
    expect(result).toContain("Carol Brown");

    // Verify "Dear Tenants" (plural for multiple tenants)
    expect(result).toContain("Dear Tenants,");

    // Verify property address with proper formatting
    expect(result).toContain("78 Property Road, Property Village, Property County PR1 4OP");

    // Verify rent information
    expect(result).toContain("£800 monthly");
    expect(result).toContain("£850 monthly");
    expect(result).toContain("1st April 2024");

    // Verify signature section
    expect(result).toContain("Property Management Ltd");
    expect(result).toContain("on behalf of your landlord:");
    expect(result).toContain("Mr John Smith");

    // Verify address for service
    expect(result).toContain("123 Agent Street");
    expect(result).toContain("Agent Town");
    expect(result).toContain("Agent County");
    expect(result).toContain("AG1 2NT");

    // Verify acknowledgment section
    expect(result).toContain("We acknowledge and agree");
    expect(result).toContain("Alice Johnson:");
    expect(result).toContain("Bob Wilson:");
    expect(result).toContain("Carol Brown:");
  });

  it("generates letter with landlord directly and single tenant", () => {
    const template = `[[agent.no]]{{landlord_name}}[[end:agent.no]]

{{tenant1_name}}

{{date}}

Dear Tenant,

Re: Rent increase for {{property_address_line1}}

This letter is to notify you that the rent will increase from £{{current_rent}} to £{{new_rent}}.

[[tenants.one]]I[[end:tenants.one]] acknowledge receipt.

{{tenant1_name}}:`;

    const data = {
      agent: {
        no: true
      },
      landlord_name: "Mrs Sarah Davis",
      tenant1_name: "David Thompson",
      tenants: {
        one: true
      },
      date: "20th March 2024",
      property_address_line1: "99 Single Street",
      current_rent: "650",
      new_rent: "680"
    };

    const result = processTemplateString(template, data);

    // Verify landlord appears directly
    expect(result).toContain("Mrs Sarah Davis");

    // Verify single tenant
    expect(result).toContain("David Thompson");

    // Verify "Dear Tenant" (singular)
    expect(result).toContain("Dear Tenant,");

    // Verify acknowledgment uses "I"
    expect(result).toContain("I acknowledge receipt");

    // Verify signature
    expect(result).toContain("David Thompson:");
  });
});
