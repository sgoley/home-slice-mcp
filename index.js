#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const HOMESLICE_API_BASE = 'https://homeslice-api.onrender.com';
const HOMESLICE_API_KEY = process.env.HOMESLICE_API_KEY || process.env.X_API_KEY;

// Validate API key on startup
if (!HOMESLICE_API_KEY) {
  console.error('Error: HOMESLICE_API_KEY environment variable is required');
  console.error('Please set it in your .env file or as an environment variable');
  process.exit(1);
}

/**
 * Fetch live mortgage rates from HomeSlice API for a given state
 */
async function fetchStateRates(state) {
  const url = `${HOMESLICE_API_BASE}/rates?state=${state.toUpperCase()}`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'x-api-key': HOMESLICE_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    throw new Error(`Failed to fetch HomeSlice rates: ${error.message}`);
  }
}

/**
 * Calculate mortgage using HomeSlice API
 */
async function calculateMortgageAPI(params) {
  const url = `${HOMESLICE_API_BASE}/calculate`;

  // Build request body with only provided parameters
  const body = {
    home_price: params.home_price,
    down_payment_amt: params.down_payment_amt,
    down_payment_type: params.down_payment_type,
    state: params.state.toUpperCase(),
    loan_term: params.loan_term || 30,
  };

  // Add optional parameters if provided
  if (params.interest_rate !== undefined) body.interest_rate = params.interest_rate;
  if (params.yearly_insurance !== undefined) body.yearly_insurance = params.yearly_insurance;
  if (params.yearly_property_tax !== undefined) body.yearly_property_tax = params.yearly_property_tax;
  if (params.monthly_pmi !== undefined) body.monthly_pmi = params.monthly_pmi;
  if (params.monthly_hoa !== undefined) body.monthly_hoa = params.monthly_hoa;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'x-api-key': HOMESLICE_API_KEY,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    throw new Error(`Failed to calculate mortgage: ${error.message}`);
  }
}

const server = new Server(
  {
    name: 'home-slice-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'get_mortgage_rates',
        description: 'Retrieve live mortgage rates for a specific state from HomeSlice API',
        inputSchema: {
          type: 'object',
          properties: {
            state: {
              type: 'string',
              description: 'Two-letter state code (e.g., FL, CA, TX)',
            },
          },
          required: ['state'],
        },
      },
      {
        name: 'calculate_mortgage',
        description: 'Calculate monthly mortgage payment with live state-specific rates using HomeSlice API',
        inputSchema: {
          type: 'object',
          properties: {
            home_price: {
              type: 'number',
              description: 'The listing price of the home',
            },
            down_payment_amt: {
              type: 'number',
              description: 'Down payment amount. If down_payment_type is "percent", enter percentage (e.g., 10 for 10%). If "amount", enter dollar amount (e.g., 80000)',
            },
            down_payment_type: {
              type: 'string',
              description: 'Type of down payment: "percent" or "amount"',
              enum: ['percent', 'amount'],
              default: 'percent',
            },
            state: {
              type: 'string',
              description: 'Two-letter state code (e.g., FL, CA, TX). Used to determine the average interest rate',
            },
            loan_term: {
              type: 'number',
              description: 'Loan term in years (15, 20, 30, or 40)',
              enum: [15, 20, 30, 40],
              default: 30,
            },
            interest_rate: {
              type: 'number',
              description: 'Annual interest rate as percentage (e.g., 6.5). If not provided, uses current average rate for the state',
            },
            yearly_insurance: {
              type: 'number',
              description: 'Yearly cost of homeowner\'s insurance in dollars',
            },
            yearly_property_tax: {
              type: 'number',
              description: 'Yearly cost of property tax in dollars',
            },
            monthly_pmi: {
              type: 'number',
              description: 'Monthly cost of private mortgage insurance (PMI) in dollars',
            },
            monthly_hoa: {
              type: 'number',
              description: 'Monthly cost of homeowner\'s association (HOA) fees in dollars',
            },
          },
          required: ['home_price', 'down_payment_amt', 'down_payment_type', 'state'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'get_mortgage_rates') {
    try {
      if (!args.state || args.state.length !== 2) {
        throw new Error('State must be a 2-letter code (e.g., FL, CA, TX)');
      }

      const rates = await fetchStateRates(args.state);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              state: rates.state.toUpperCase(),
              event_datetime: rates.event_datetime,
              rates: {
                '30_year_fixed': rates.thirty_year_fixed,
                '30_year_fixed_fha': rates.thirty_year_fixed_fha,
                '30_year_fixed_va': rates.thirty_year_fixed_va,
                '20_year_fixed': rates.twenty_year_fixed,
                '15_year_fixed': rates.fifteen_year_fixed,
                '10_year_fixed': rates.ten_year_fixed,
                '7_year_arm': rates.seven_year_arm,
                '5_year_arm': rates.five_year_arm,
              },
              source: 'HomeSlice API',
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: Failed to fetch rates: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  if (name === 'calculate_mortgage') {
    try {
      // Validate required inputs
      if (!args.home_price || args.home_price <= 0) {
        throw new Error('Home price must be a positive number');
      }

      if (args.down_payment_amt === undefined || args.down_payment_amt < 0) {
        throw new Error('Down payment must be a positive number');
      }

      if (!args.down_payment_type || !['percent', 'amount'].includes(args.down_payment_type)) {
        throw new Error('Down payment type must be "percent" or "amount"');
      }

      if (!args.state || args.state.length !== 2) {
        throw new Error('State must be a 2-letter code (e.g., FL, CA, TX)');
      }

      // Call HomeSlice API to calculate mortgage
      const result = await calculateMortgageAPI(args);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: Calculation failed: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  return {
    content: [
      {
        type: 'text',
        text: `Error: Unknown tool: ${name}`,
      },
    ],
    isError: true,
  };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('HomeSlice MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
